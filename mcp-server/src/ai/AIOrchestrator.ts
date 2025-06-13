import AdvancedPromptClassifier, { ClassificationResult } from './PromptClassifier.js';
import { DynamicPromptGenerator } from './DynamicPromptGenerator.js';
import { ContentOptimizer } from './ContentOptimizer.js';

/**
 * AI Orchestration System - Similar to Cursor AI's multi-model approach
 * Intelligently routes prompts through different AI models and optimization layers
 */

export interface OrchestrationResult {
    classification: ClassificationResult;
    optimizedPrompt: string;
    generatedContent: string;
    confidence: number;
    processingPath: string[];
    metadata: {
        modelUsed: string;
        processingTime: number;
        optimizations: string[];
        fallbacksUsed: string[];
    };
}

export interface AIModel {
    name: string;
    endpoint: string;
    strengths: string[];
    weaknesses: string[];
    costPerToken: number;
    maxTokens: number;
    temperature: number;
    priority: number; // 1 = highest priority, 3 = lowest
    isImageCapable: boolean;
}

export interface APIKeyConfig {
    key: string;
    isActive: boolean;
    rateLimitCount: number;
    lastResetTime: number;
    maxRequestsPerMinute: number;
}

export class AIOrchestrator {
    private classifier: AdvancedPromptClassifier;
    private promptGenerator: DynamicPromptGenerator;
    private contentOptimizer: ContentOptimizer;

    // Multiple API keys for rate limit handling - loaded from environment variables
    private readonly apiKeys: APIKeyConfig[] = this.initializeAPIKeys();

    // Available AI models with their characteristics and priorities
    private readonly models: Record<string, AIModel> = {
        'gemini-2.0-flash': {
            name: 'Gemini 2.0 Flash',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
            strengths: ['fast', 'creative', 'conversational', 'general-purpose', 'content-generation'],
            weaknesses: ['less-technical', 'shorter-context'],
            costPerToken: 0.0001,
            maxTokens: 2500, // Increased for longer LinkedIn posts (1200-2000 chars)
            temperature: 0.8,
            priority: 1, // Highest priority
            isImageCapable: false
        },
        'gemini-2.0-flash-lite': {
            name: 'Gemini 2.0 Flash Lite',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent',
            strengths: ['fast', 'efficient', 'lightweight', 'quick-responses'],
            weaknesses: ['less-detailed', 'shorter-responses'],
            costPerToken: 0.00005,
            maxTokens: 2000, // Increased for adequate LinkedIn post length
            temperature: 0.8,
            priority: 2, // Second priority
            isImageCapable: false
        },
        'gemma-3-27b-it': {
            name: 'Gemma 3 27B IT',
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:generateContent',
            strengths: ['image-analysis', 'multimodal', 'technical', 'precise', 'visual-understanding'],
            weaknesses: ['text-only-limited', 'specialized'],
            costPerToken: 0.0003,
            maxTokens: 3000, // Increased for detailed analysis and content generation
            temperature: 0.7,
            priority: 3, // Third priority (but only choice for images)
            isImageCapable: true
        }
    };

    // Model selection rules based on content classification and priority system
    private readonly modelSelectionRules = {
        journey: {
            primary: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            tertiary: 'gemma-3-27b-it',
            reason: 'Creative storytelling and conversational tone'
        },
        technical: {
            primary: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            tertiary: 'gemma-3-27b-it',
            reason: 'Technical content with creative presentation'
        },
        achievement: {
            primary: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            tertiary: 'gemma-3-27b-it',
            reason: 'Engaging and celebratory content'
        },
        learning: {
            primary: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            tertiary: 'gemma-3-27b-it',
            reason: 'Educational content with engaging delivery'
        },
        general: {
            primary: 'gemini-2.0-flash',
            fallback: 'gemini-2.0-flash-lite',
            tertiary: 'gemma-3-27b-it',
            reason: 'Balanced approach for general content'
        },
        image: {
            primary: 'gemma-3-27b-it',
            fallback: 'gemma-3-27b-it', // Only option for images
            tertiary: 'gemma-3-27b-it',
            reason: 'Image analysis requires multimodal capabilities'
        }
    };

    constructor() {
        this.classifier = new AdvancedPromptClassifier();
        this.promptGenerator = new DynamicPromptGenerator();
        this.contentOptimizer = new ContentOptimizer();

        // Initialize API key monitoring
        this.initializeAPIKeyMonitoring();
    }

    /**
     * Initialize API keys from environment variables
     */
    private initializeAPIKeys(): APIKeyConfig[] {
        const keys: APIKeyConfig[] = [];

        // Try to load multiple API keys from environment
        const apiKey1 = process.env.GEMINI_API_KEY_1 || process.env.GEMINI_API_KEY || '';
        const apiKey2 = process.env.GEMINI_API_KEY_2 || '';
        const apiKey3 = process.env.GEMINI_API_KEY_3 || '';

        // Add primary key
        if (apiKey1.trim()) {
            keys.push({
                key: apiKey1,
                isActive: true,
                rateLimitCount: 0,
                lastResetTime: Date.now(),
                maxRequestsPerMinute: 60
            });
        }

        // Add secondary key
        if (apiKey2.trim()) {
            keys.push({
                key: apiKey2,
                isActive: true,
                rateLimitCount: 0,
                lastResetTime: Date.now(),
                maxRequestsPerMinute: 60
            });
        }

        // Add tertiary key
        if (apiKey3.trim()) {
            keys.push({
                key: apiKey3,
                isActive: true,
                rateLimitCount: 0,
                lastResetTime: Date.now(),
                maxRequestsPerMinute: 60
            });
        }

        if (keys.length === 0) {
            console.warn('⚠️ No valid API keys found in environment variables');
        } else {
            console.log(`✅ Initialized ${keys.length} API key(s) for rate limit handling`);
        }

        return keys;
    }

    /**
     * Safely mask API key for logging (shows only first 8 characters)
     */
    private maskAPIKey(apiKey: string): string {
        if (!apiKey || apiKey.length < 8) {
            return 'invalid_key';
        }
        return `${apiKey.substring(0, 8)}...***`;
    }

    /**
     * Sanitize error messages to remove sensitive information
     */
    private sanitizeErrorMessage(message: string): string {
        if (!message) return 'Unknown error';

        // Remove any potential API keys from error messages
        return message
            .replace(/AIza[A-Za-z0-9_-]{35}/g, '[API_KEY_HIDDEN]')
            .replace(/key=[A-Za-z0-9_-]+/g, 'key=[HIDDEN]')
            .replace(/token=[A-Za-z0-9_-]+/g, 'token=[HIDDEN]')
            .replace(/authorization:\s*[A-Za-z0-9_-]+/gi, 'authorization: [HIDDEN]');
    }

    /**
     * Initialize API key monitoring and rate limit tracking
     */
    private initializeAPIKeyMonitoring(): void {
        // Reset rate limits every minute
        setInterval(() => {
            const now = Date.now();
            this.apiKeys.forEach(keyConfig => {
                if (now - keyConfig.lastResetTime >= 60000) { // 1 minute
                    keyConfig.rateLimitCount = 0;
                    keyConfig.lastResetTime = now;
                    keyConfig.isActive = true; // Reactivate if it was rate limited
                }
            });
        }, 60000); // Check every minute
    }

    /**
     * Get the next available API key with rate limit checking
     */
    private getAvailableAPIKey(): APIKeyConfig | null {
        // Find an active API key that hasn't hit rate limit
        for (const keyConfig of this.apiKeys) {
            if (keyConfig.isActive &&
                keyConfig.rateLimitCount < keyConfig.maxRequestsPerMinute &&
                keyConfig.key.trim() !== '') {
                return keyConfig;
            }
        }

        // If all keys are rate limited, find the one with the lowest count
        const leastUsedKey = this.apiKeys
            .filter(k => k.key.trim() !== '')
            .sort((a, b) => a.rateLimitCount - b.rateLimitCount)[0];

        return leastUsedKey || null;
    }

    /**
     * Mark an API key as rate limited
     */
    private markAPIKeyAsRateLimited(apiKey: string): void {
        const keyConfig = this.apiKeys.find(k => k.key === apiKey);
        if (keyConfig) {
            keyConfig.isActive = false;
            console.warn(`🚫 API key ${this.maskAPIKey(apiKey)} marked as rate limited`);
        }
    }

    /**
     * Increment usage count for an API key
     */
    private incrementAPIKeyUsage(apiKey: string): void {
        const keyConfig = this.apiKeys.find(k => k.key === apiKey);
        if (keyConfig) {
            keyConfig.rateLimitCount++;
        }
    }

    /**
     * Main orchestration method - intelligently processes user input
     */
    public async processContent(
        userPrompt: string,
        userContext?: {
            name?: string;
            role?: string;
            industry?: string;
            previousPosts?: string[];
        }
    ): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const processingPath: string[] = [];
        const fallbacksUsed: string[] = [];
        const optimizations: string[] = [];

        try {
            // Step 1: Classify the prompt
            processingPath.push('classification');
            const classification = await this.classifier.classifyPrompt(userPrompt);

            // Step 2: Select optimal AI model
            processingPath.push('model-selection');
            const selectedModel = this.selectOptimalModel(classification);

            // Step 3: Generate dynamic prompt
            processingPath.push('prompt-generation');
            const optimizedPrompt = await this.promptGenerator.generatePrompt(
                userPrompt,
                classification,
                userContext
            );
            optimizations.push('dynamic-prompt-generation');

            // Step 4: Generate content with selected model and comprehensive fallbacks
            processingPath.push('content-generation');
            let generatedContent: string;
            let modelUsed = selectedModel.primary;

            // Get priority order for fallback attempts
            const modelPriorityOrder = this.getModelPriorityOrder(selectedModel);
            let lastError: any = null;

            // Try each model in priority order
            for (let i = 0; i < modelPriorityOrder.length; i++) {
                const currentModelKey = modelPriorityOrder[i];
                const currentModel = this.models[currentModelKey];

                if (!currentModel) {
                    console.warn(`Model ${currentModelKey} not found, skipping...`);
                    continue;
                }

                try {
                    console.log(`🎯 Attempting content generation with ${currentModel.name} (priority ${i + 1})`);

                    generatedContent = await this.generateWithModel(
                        optimizedPrompt,
                        currentModel
                    );

                    modelUsed = currentModelKey;
                    console.log(`✅ Successfully generated content with ${currentModel.name}`);
                    break; // Success! Exit the loop

                } catch (error: any) {
                    lastError = error;
                    console.warn(`❌ Model ${currentModel.name} failed:`, error.message);

                    if (i < modelPriorityOrder.length - 1) {
                        fallbacksUsed.push(currentModelKey);
                        console.log(`🔄 Falling back to next model...`);
                        continue;
                    }
                }
            }

            // If all models failed, throw the last error
            if (!generatedContent!) {
                throw new Error(`All models failed. Last error: ${lastError?.message || 'Unknown error'}`);
            }

            // Step 5: Optimize generated content
            processingPath.push('content-optimization');
            const optimizedContent = await this.contentOptimizer.optimize(
                generatedContent,
                classification
            );
            optimizations.push(...this.contentOptimizer.getLastOptimizations());

            const processingTime = Date.now() - startTime;

            return {
                classification,
                optimizedPrompt,
                generatedContent: optimizedContent,
                confidence: classification.confidence,
                processingPath,
                metadata: {
                    modelUsed,
                    processingTime,
                    optimizations,
                    fallbacksUsed
                }
            };

        } catch (error) {
            console.error('AI Orchestration error:', error);

            // Ultimate fallback - simple processing
            const fallbackContent = await this.fallbackProcessing(userPrompt);

            return {
                classification: {
                    storyType: 'general',
                    confidence: 0.5,
                    reasoning: 'Fallback classification due to processing error',
                    suggestedTemplate: 'General LinkedIn post',
                    contentType: 'professional',
                    tone: 'casual',
                    audience: 'general',
                    keywords: [],
                    metadata: {
                        uncertainty: 0.8,
                        featureScores: {},
                        validationMetrics: {
                            crossValidationScore: 0.5,
                            precisionScore: 0.5,
                            recallScore: 0.5,
                            f1Score: 0.5,
                            confidenceCalibration: 0.5
                        }
                    }
                },
                optimizedPrompt: userPrompt,
                generatedContent: fallbackContent,
                confidence: 0.5,
                processingPath: ['fallback'],
                metadata: {
                    modelUsed: 'fallback',
                    processingTime: Date.now() - startTime,
                    optimizations: [],
                    fallbacksUsed: ['all-models']
                }
            };
        }
    }

    /**
     * Select the optimal AI model based on classification and content type
     */
    private selectOptimalModel(classification: ClassificationResult, isImageContent: boolean = false) {
        // For image content, always use Gemma (only image-capable model)
        if (isImageContent) {
            return this.modelSelectionRules.image;
        }

        const rules = this.modelSelectionRules[classification.storyType] ||
            this.modelSelectionRules.general;

        // Additional logic for model selection based on confidence
        if (classification.confidence < 0.6) {
            // Still prefer primary model but with more fallbacks
            return {
                primary: 'gemini-2.0-flash',
                fallback: 'gemini-2.0-flash-lite',
                tertiary: 'gemma-3-27b-it',
                reason: 'Low confidence classification with comprehensive fallbacks'
            };
        }

        return rules;
    }

    /**
     * Get models in priority order for fallback attempts
     */
    private getModelPriorityOrder(selectedModel: any): string[] {
        return [
            selectedModel.primary,
            selectedModel.fallback,
            selectedModel.tertiary
        ].filter(Boolean);
    }

    /**
     * Generate content using specified AI model with multi-API key support
     */
    private async generateWithModel(prompt: string, model: AIModel, imageData?: { mimeType: string, data: string }): Promise<string> {
        const axios = require('axios');

        // Try each available API key until one works
        let lastError: any = null;

        for (let attempt = 0; attempt < this.apiKeys.length; attempt++) {
            const apiKeyConfig = this.getAvailableAPIKey();

            if (!apiKeyConfig || !apiKeyConfig.key) {
                throw new Error('No available API keys configured');
            }

            try {
                // Increment usage count
                this.incrementAPIKeyUsage(apiKeyConfig.key);

                // Prepare request body
                const requestBody: any = {
                    contents: [{
                        parts: imageData
                            ? [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: imageData.mimeType,
                                        data: imageData.data
                                    }
                                }
                            ]
                            : [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: model.temperature,
                        maxOutputTokens: model.maxTokens,
                        topP: 0.9,
                        topK: 40
                    }
                };

                // Validate request body
                console.log(`🔍 Request validation:`);
                console.log(`   - Prompt in request body length: ${requestBody.contents[0].parts[0].text.length} chars`);
                console.log(`   - Max output tokens: ${requestBody.generationConfig.maxOutputTokens}`);
                console.log(`   - Temperature: ${requestBody.generationConfig.temperature}`);

                console.log(`🔄 Attempting generation with ${model.name} using API key ${this.maskAPIKey(apiKeyConfig.key)}`);
                console.log(`📤 Sending to Gemini - Prompt length: ${prompt.length} characters`);
                console.log(`📤 Max tokens configured: ${model.maxTokens}`);
                console.log(`📤 Prompt preview: ${prompt.substring(0, 500)}...`);

                // Log the complete enhanced prompt for debugging
                console.log('\n' + '='.repeat(80));
                console.log('📋 COMPLETE ENHANCED PROMPT BEING SENT TO AI:');
                console.log('='.repeat(80));
                console.log(prompt);
                console.log('='.repeat(80));
                console.log('📋 END OF ENHANCED PROMPT\n');

                const response = await axios.post(
                    model.endpoint,
                    requestBody,
                    {
                        params: { key: apiKeyConfig.key },
                        headers: { 'Content-Type': 'application/json' },
                        timeout: 30000
                    }
                );

                if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error(`Invalid response from ${model.name}`);
                }

                const generatedText = response.data.candidates[0].content.parts[0].text;
                console.log(`✅ Successfully generated content with ${model.name} using ${this.maskAPIKey(apiKeyConfig.key)}`);
                console.log(`📊 Generated content length: ${generatedText.length} characters`);
                console.log(`📝 Generated content preview: ${generatedText.substring(0, 300)}...`);

                // Check if content meets minimum length requirement
                if (generatedText.length < 1200) {
                    console.warn(`⚠️ Generated content is too short: ${generatedText.length} chars (minimum: 1200)`);
                    console.warn(`🔍 This might indicate the AI model is not processing the full prompt correctly`);
                }

                return generatedText;

            } catch (error: any) {
                lastError = error;
                console.warn(`❌ API key ${this.maskAPIKey(apiKeyConfig.key)} failed:`, this.sanitizeErrorMessage(error.message));

                // Check if it's a rate limit error
                if (error.response?.status === 429) {
                    this.markAPIKeyAsRateLimited(apiKeyConfig.key);
                    console.log(`🚫 Rate limit hit for API key ${this.maskAPIKey(apiKeyConfig.key)}`);
                    continue; // Try next API key
                }

                // For other errors, still try next API key
                if (attempt < this.apiKeys.length - 1) {
                    console.log(`🔄 Trying next API key...`);
                    continue;
                }
            }
        }

        // If all API keys failed, throw the last error
        throw new Error(`All API keys failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    /**
     * Fallback processing when all else fails
     */
    private async fallbackProcessing(userPrompt: string): Promise<string> {
        // Simple template-based fallback
        return `Here's a professional LinkedIn post based on your input:

${userPrompt}

This content has been processed using our fallback system. For optimal results, please ensure your API keys are properly configured.

#LinkedIn #Professional #PostWizz`;
    }



    /**
     * Generate enhanced prompt with scraped content for GitHub repositories
     */
    private generateScrapedContentPrompt(
        userPrompt: string,
        scrapedData: any[],
        classification: any,
        userContext?: any
    ): string {
        console.log(`🎯 Generating GitHub-specific enhanced prompt...`);

        // Check if we have GitHub data
        const hasGitHubData = scrapedData.some(data => data.type === 'github');

        if (hasGitHubData) {
            console.log(`🐙 GitHub repository detected - using specialized prompt template`);

            let enhancedPrompt = `You are creating a professional LinkedIn post about a GitHub repository.

User's request: "${userPrompt}"

Repository Analysis:
`;

            scrapedData.forEach((data, index) => {
                if (data.status === 'success' && data.type === 'github') {
                    enhancedPrompt += `
📊 Repository: ${data.title}
🔗 URL: ${data.url}
📝 Description: ${data.description}
⭐ Stars: ${data.github?.stars || 0}
🍴 Forks: ${data.github?.forks || 0}
💻 Language: ${data.github?.language || 'Not specified'}
📦 Size: ${data.github?.size || 0} KB
`;

                    // Add comprehensive project structure and file contents
                    if (data.github?.projectFiles && Object.keys(data.github.projectFiles).length > 0) {
                        console.log(`📦 Processing ${Object.keys(data.github.projectFiles).length} project files for AI prompt`);
                        enhancedPrompt += `
🏗️ Project Structure & Configuration Files:
`;
                        Object.entries(data.github.projectFiles).forEach(([fileName, fileData]: [string, any]) => {
                            console.log(`📄 Adding ${fileName} to prompt - Content length: ${fileData.content?.length || 0} chars`);
                            enhancedPrompt += `
📄 ${fileName} (${fileData.description}):
`;

                            // Add specific details for package.json
                            if (fileName === 'package.json' && fileData.parsed) {
                                const deps = Object.keys(fileData.parsed.dependencies || {});
                                const devDeps = Object.keys(fileData.parsed.devDependencies || {});
                                const scripts = Object.keys(fileData.parsed.scripts || {});

                                enhancedPrompt += `  📛 Name: ${fileData.parsed.name || 'Not specified'}\n`;
                                enhancedPrompt += `  🏷️ Version: ${fileData.parsed.version || 'Not specified'}\n`;
                                enhancedPrompt += `  📝 Description: ${fileData.parsed.description || 'Not specified'}\n`;

                                if (deps.length > 0) {
                                    enhancedPrompt += `  📦 Dependencies (${deps.length}): ${deps.slice(0, 10).join(', ')}${deps.length > 10 ? ` and ${deps.length - 10} more` : ''}\n`;
                                }
                                if (devDeps.length > 0) {
                                    enhancedPrompt += `  🔧 Dev Dependencies (${devDeps.length}): ${devDeps.slice(0, 5).join(', ')}${devDeps.length > 5 ? ` and ${devDeps.length - 5} more` : ''}\n`;
                                }
                                if (scripts.length > 0) {
                                    enhancedPrompt += `  ⚡ Scripts: ${scripts.join(', ')}\n`;
                                }

                                // ALWAYS add raw content for comprehensive context
                                if (fileData.content) {
                                    enhancedPrompt += `  📋 Full File Content:\n${fileData.content}\n`;
                                }
                            } else {
                                // For non-JSON files, include the content directly
                                if (fileData.content) {
                                    enhancedPrompt += `  📋 Content:\n${fileData.content}\n`;
                                }
                            }
                        });
                    }

                    // Also check if project files are in metadata (alternative data structure)
                    if (data.metadata?.projectFiles && Object.keys(data.metadata.projectFiles).length > 0) {
                        enhancedPrompt += `
🏗️ Additional Project Files:
`;
                        Object.entries(data.metadata.projectFiles).forEach(([fileName, fileData]: [string, any]) => {
                            enhancedPrompt += `
📄 ${fileName} (${fileData.description || 'Configuration file'}):
`;
                            if (fileData.content) {
                                enhancedPrompt += `  📋 Content:\n${fileData.content}\n`;
                            }
                        });
                    }

                    // Add README content (first 2000 chars for context)
                    if (data.content && data.content.length > 0) {
                        const readmePreview = data.content.substring(0, 2000);
                        enhancedPrompt += `
📖 README Content:
${readmePreview}${data.content.length > 2000 ? '\n...(content continues)' : ''}
`;
                    }
                }
            });

            enhancedPrompt += `

🎯 CONTENT CREATION GUIDELINES:

Create a compelling LinkedIn post that showcases this GitHub repository professionally. Focus on:

1. **TECHNICAL STORYTELLING**:
   - Start with the problem this project solves
   - Highlight the innovative technical approach
   - Explain why the technology choices matter
   - Connect technical features to real-world impact

2. **ENGAGEMENT STRATEGY**:
   - Use a compelling hook that grabs attention
   - Share insights about the development process
   - Highlight unique or impressive technical aspects
   - Ask thought-provoking questions to encourage discussion

3. **PROFESSIONAL TONE**:
   - Write as a developer sharing an exciting discovery
   - Be enthusiastic but credible
   - Focus on learning and innovation
   - Avoid overly promotional language

4. **TECHNICAL DEPTH**:
   - Mention specific technologies and why they're significant
   - Reference architecture decisions and their benefits
   - Highlight any innovative patterns or approaches
   - Connect the tech stack to the project's goals

5. **STRUCTURE & FORMAT**:
   - MINIMUM 1400 characters, TARGET 1600-2000 characters for optimal LinkedIn engagement
   - Use natural paragraph breaks (actual line breaks between paragraphs)
   - NO markdown formatting (**bold**, etc.) - use plain text only
   - NO meta-commentary or introductory phrases like "Here's a post about..."
   - Include 3-5 relevant hashtags at the end
   - Write in first person for authenticity and personal connection
   - Create 4-6 substantial paragraphs with detailed technical insights

6. **VALUE PROPOSITION**:
   - What can the LinkedIn audience learn from this?
   - Why should developers care about this project?
   - What makes this technically interesting or innovative?
   - How does it contribute to the broader tech community?
   - What specific technical challenges were solved?
   - What lessons can other developers apply to their work?

7. **CONTENT DEPTH REQUIREMENTS**:
   - Explain the technical architecture and key components
   - Discuss specific technology choices and their benefits
   - Share insights about the development process and challenges
   - Connect the project to broader industry trends or problems
   - Include specific details from the README and project files
   - Make it educational and valuable for the developer community

Generate a compelling, detailed LinkedIn post that meets these STRICT requirements:
- MINIMUM 1400 characters (aim for 1600-2000 characters)
- 4-6 substantial paragraphs with technical depth
- Include specific details from the repository analysis above
- Write in first person with authentic developer voice
- NO introductory phrases - start directly with engaging content
- End with 3-5 relevant hashtags

Start writing the LinkedIn post now:`;

            console.log(`✅ GitHub-enhanced prompt generated (${enhancedPrompt.length} characters)`);
            console.log(`📝 Enhanced prompt preview (first 500 chars): ${enhancedPrompt.substring(0, 500)}...`);
            console.log(`📊 Project files section length: ${enhancedPrompt.includes('🏗️ Project Structure') ? 'INCLUDED' : 'MISSING'}`);
            return enhancedPrompt;
        } else {
            // Fallback to generic scraped content prompt
            console.log(`🌐 Non-GitHub content detected - using generic prompt template`);
            return this.generateGenericScrapedPrompt(userPrompt, scrapedData, userContext);
        }
    }

    /**
     * Generate generic prompt for non-GitHub scraped content
     */
    private generateGenericScrapedPrompt(
        userPrompt: string,
        scrapedData: any[],
        userContext?: any
    ): string {
        let enhancedPrompt = `You are writing a LinkedIn post that integrates user thoughts with scraped content insights.

Original user text: "${userPrompt}"

Additional context from scraped sources:
`;

        scrapedData.forEach((data, index) => {
            if (data.status === 'success') {
                enhancedPrompt += `\nSource ${index + 1}: ${data.title}
URL: ${data.url}
Type: ${data.type}
`;

                if (data.description) {
                    enhancedPrompt += `Description: ${data.description}\n`;
                }

                if (data.metadata?.author) {
                    enhancedPrompt += `Author: ${data.metadata.author}\n`;
                }

                // Add content preview (first 500 chars)
                const contentPreview = data.content.substring(0, 500);
                enhancedPrompt += `Content Preview: ${contentPreview}${data.content.length > 500 ? '...' : ''}\n`;
            }
        });

        enhancedPrompt += `\nCreate a professional LinkedIn post that:
1. Integrates the user's original thoughts with insights from the scraped content
2. Maintains an authentic, personal voice
3. Provides value to the LinkedIn audience
4. Uses natural paragraph formatting with proper line breaks
5. Is 1200-2000 characters long
6. Does not use ** bold formatting
7. Does not include email-like prefixes or meta-commentary

Generate the LinkedIn post content directly without any prefixes or explanations.`;

        return enhancedPrompt;
    }

    /**
     * Get processing statistics
     */
    public getProcessingStats(): {
        modelsAvailable: number;
        totalProcessingPaths: number;
        averageConfidence: number;
    } {
        return {
            modelsAvailable: Object.keys(this.models).length,
            totalProcessingPaths: 5, // classification, selection, generation, optimization, fallback
            averageConfidence: 0.85 // Based on typical performance
        };
    }

    /**
     * Process content with scraped data integration
     */
    public async processContentWithScrapedData(
        userPrompt: string,
        scrapedData: any[],
        userContext?: {
            name?: string;
            role?: string;
            industry?: string;
            previousPosts?: string[];
        }
    ): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const processingPath: string[] = [];
        const fallbacksUsed: string[] = [];
        const optimizations: string[] = [];

        try {
            // Step 1: Classify the combined content
            processingPath.push('classification-with-scraped-data');
            const classification = await this.classifier.classifyPrompt(userPrompt);

            // Step 2: Select optimal AI model
            processingPath.push('model-selection');
            const selectedModel = this.selectOptimalModel(classification);

            // Step 3: Generate enhanced prompt with scraped content
            processingPath.push('scraped-content-prompt-generation');
            const enhancedPrompt = this.generateScrapedContentPrompt(
                userPrompt,
                scrapedData,
                classification,
                userContext
            );

            // Step 4: Generate content with optimal model
            processingPath.push('content-generation-with-context');
            const modelPriorityOrder = this.getModelPriorityOrder(selectedModel);
            let generatedContent = '';
            let modelUsed = '';

            // Try each model in priority order
            for (let i = 0; i < modelPriorityOrder.length; i++) {
                const currentModelKey = modelPriorityOrder[i];
                const currentModel = this.models[currentModelKey];

                if (!currentModel) {
                    console.warn(`Model ${currentModelKey} not found, skipping...`);
                    continue;
                }

                try {
                    console.log(`🎯 Attempting content generation with ${currentModel.name} (priority ${i + 1})`);
                    console.log(`📝 Enhanced prompt preview (first 300 chars): ${enhancedPrompt.substring(0, 300)}...`);
                    console.log(`📊 Enhanced prompt total length: ${enhancedPrompt.length} characters`);

                    generatedContent = await this.generateWithModel(
                        enhancedPrompt,
                        currentModel
                    );

                    modelUsed = currentModelKey;
                    console.log(`✅ Successfully generated content with ${currentModel.name}`);
                    console.log(`📄 Generated content preview: ${generatedContent.substring(0, 200)}...`);
                    break; // Success! Exit the loop

                } catch (error) {
                    console.error(`❌ Model ${currentModel.name} failed:`, error);
                    fallbacksUsed.push(currentModelKey);

                    if (i === modelPriorityOrder.length - 1) {
                        throw new Error(`All models failed. Last error: ${error}`);
                    }
                }
            }

            // Step 5: Optimize with scraped context
            processingPath.push('content-optimization-with-context');
            const optimizedContent = await this.contentOptimizer.optimize(
                generatedContent,
                classification
            );

            optimizations.push(...this.contentOptimizer.getLastOptimizations());

            const processingTime = Date.now() - startTime;

            return {
                classification,
                optimizedPrompt: enhancedPrompt,
                generatedContent: optimizedContent,
                confidence: classification.confidence,
                processingPath,
                metadata: {
                    modelUsed,
                    processingTime,
                    optimizations: [...optimizations, 'scraped-content-integration'],
                    fallbacksUsed
                }
            };

        } catch (error) {
            console.error('AI Orchestration with scraped data error:', error);
            throw error;
        }
    }

    /**
     * Process image content with two-step workflow:
     * 1. Gemma analyzes the image and extracts insights
     * 2. Gemini Flash generates the final LinkedIn post
     */
    public async processImageContent(
        userPrompt: string,
        imageData: { mimeType: string, data: string },
        userContext?: {
            name?: string;
            role?: string;
            industry?: string;
            previousPosts?: string[];
        }
    ): Promise<OrchestrationResult> {
        const startTime = Date.now();
        const processingPath: string[] = [];
        const fallbacksUsed: string[] = [];
        const optimizations: string[] = [];

        try {
            // Step 1: Classify the prompt
            processingPath.push('classification');
            const classification = await this.classifier.classifyPrompt(userPrompt);

            // Step 2: Image Analysis with Gemma (only image-capable model)
            processingPath.push('image-analysis');
            console.log(`🔍 Step 1: Analyzing image with Gemma 3-27B-IT...`);

            const imageAnalysisPrompt = `Analyze this image in detail. Extract key information about:
1. What's in the image (objects, people, scene, setting)
2. Key themes or messages conveyed
3. Professional context (business, tech, marketing, etc.)
4. Visual elements that could be relevant for LinkedIn content
5. Any text or data visible in the image

Provide a comprehensive but concise analysis that can be used to create professional LinkedIn content.`;

            const imageAnalysis = await this.generateWithModel(
                imageAnalysisPrompt,
                this.models['gemma-3-27b-it'], // Force Gemma for image analysis
                imageData
            );

            console.log(`✅ Step 1 Complete: Image analysis extracted`);
            console.log(`📝 Image Analysis Preview: ${imageAnalysis.substring(0, 200)}...`);
            optimizations.push('two-step-image-processing');

            // Step 3: Content Generation with Gemini Flash
            processingPath.push('content-generation');
            console.log(`🚀 Step 2: Generating LinkedIn post with Gemini 2.0 Flash...`);

            // Create enhanced prompt combining user input and image analysis
            const enhancedPrompt = `Create a professional LinkedIn post based on the user's request and image analysis.

User's Request: ${userPrompt}

Image Analysis: ${imageAnalysis}

User Context: ${userContext?.name || 'Professional'}

Create a natural LinkedIn post that:
- Integrates insights from the image analysis
- Follows the user's request/direction
- Uses professional yet conversational tone
- Is 1200-2000 characters for optimal engagement
- Has proper paragraph breaks with actual line breaks between paragraphs
- Includes 3-5 relevant hashtags at the end
- NO asterisk formatting (**bold**) - use plain text only
- NO introductory phrases like "Here's a LinkedIn post"
- NO placeholder text in brackets []
- NO HTML tags or markdown formatting
- NO escaped characters like \\n - use actual line breaks

FORMATTING EXAMPLE:
First paragraph with engaging opening.

Second paragraph with key insights.

Third paragraph with call to action.

#Hashtag1 #Hashtag2 #Hashtag3

Start immediately with the post content:`;

            // Use text-only model selection for final content generation
            const textModel = this.selectOptimalModel(classification, false);
            const finalContent = await this.generateWithModel(
                enhancedPrompt,
                this.models[textModel.primary] // Use Gemini Flash for final content
            );

            console.log(`✅ Step 2 Complete: LinkedIn post generated with ${textModel.primary}`);
            console.log(`📄 Generated Content Preview: ${finalContent.substring(0, 200)}...`);

            // Step 4: Optimize generated content (remove asterisks and clean formatting)
            processingPath.push('content-optimization');
            console.log(`🔧 Before optimization - checking for escaped newlines: ${finalContent.includes('\\n') ? 'FOUND \\n' : 'NO \\n found'}`);

            const optimizedContent = await this.contentOptimizer.optimize(
                finalContent,
                classification
            );
            optimizations.push(...this.contentOptimizer.getLastOptimizations());

            console.log(`✅ After optimization - final content preview: ${optimizedContent.substring(0, 200)}...`);

            const processingTime = Date.now() - startTime;

            return {
                classification,
                optimizedPrompt: enhancedPrompt,
                generatedContent: optimizedContent,
                confidence: classification.confidence,
                processingPath,
                metadata: {
                    modelUsed: `gemma-3-27b-it → ${textModel.primary}`,
                    processingTime,
                    optimizations,
                    fallbacksUsed
                }
            };

        } catch (error) {
            console.error('Image content processing error:', error);
            throw error; // Re-throw for proper error handling
        }
    }

    /**
     * Health check for all AI models and API keys
     */
    public async healthCheck(): Promise<{
        models: Record<string, boolean>;
        apiKeys: Record<string, { active: boolean; usage: number; limit: number }>;
        overall: boolean;
    }> {
        const modelHealth: Record<string, boolean> = {};
        const apiKeyStatus: Record<string, { active: boolean; usage: number; limit: number }> = {};

        // Check model health
        for (const [modelKey, model] of Object.entries(this.models)) {
            try {
                await this.generateWithModel('Health check test', model);
                modelHealth[modelKey] = true;
            } catch (error) {
                modelHealth[modelKey] = false;
                console.warn(`Health check failed for ${model.name}:`, error);
            }
        }

        // Check API key status
        this.apiKeys.forEach((keyConfig, index) => {
            const keyId = `key_${index + 1}_${this.maskAPIKey(keyConfig.key)}`;
            apiKeyStatus[keyId] = {
                active: keyConfig.isActive,
                usage: keyConfig.rateLimitCount,
                limit: keyConfig.maxRequestsPerMinute
            };
        });

        const overallHealth = Object.values(modelHealth).some(healthy => healthy) &&
            this.apiKeys.some(key => key.isActive && key.key.trim() !== '');

        return {
            models: modelHealth,
            apiKeys: apiKeyStatus,
            overall: overallHealth
        };
    }

    /**
     * Get current API key usage statistics
     */
    public getAPIKeyStats(): {
        totalKeys: number;
        activeKeys: number;
        totalRequests: number;
        averageUsage: number;
    } {
        const activeKeys = this.apiKeys.filter(k => k.isActive && k.key.trim() !== '').length;
        const totalRequests = this.apiKeys.reduce((sum, k) => sum + k.rateLimitCount, 0);
        const averageUsage = activeKeys > 0 ? totalRequests / activeKeys : 0;

        return {
            totalKeys: this.apiKeys.length,
            activeKeys,
            totalRequests,
            averageUsage: Math.round(averageUsage * 100) / 100
        };
    }
}
