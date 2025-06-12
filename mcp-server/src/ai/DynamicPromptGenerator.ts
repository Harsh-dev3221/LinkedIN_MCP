import { ClassificationResult } from './PromptClassifier.js';

/**
 * Dynamic Prompt Generation System
 * Creates context-aware, optimized prompts based on classification and user context
 */

export interface UserContext {
    name?: string;
    role?: string;
    industry?: string;
    previousPosts?: string[];
    writingStyle?: 'formal' | 'casual' | 'technical' | 'inspirational';
    targetAudience?: string;
}

export interface PromptTemplate {
    base: string;
    contextualAdditions: string[];
    styleModifiers: Record<string, string>;
    audienceAdaptations: Record<string, string>;
}

export class DynamicPromptGenerator {

    // Advanced prompt templates for each story type
    private readonly templates: Record<string, PromptTemplate> = {
        journey: {
            base: `You are writing a compelling LinkedIn journey story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a personal/professional journey story: {USER_PROMPT}

Write for {USER_NAME} using this JOURNEY STORY structure:

STORY ARC:
1. **The Challenge/Problem** (1-2 sentences): Start with a relatable problem or challenge
2. **The Journey/Learning** (2-3 sentences): Describe the learning process, struggles, discoveries
3. **The Solution/Breakthrough** (1-2 sentences): The key insight or solution found
4. **The Results/Impact** (1-2 sentences): What was achieved or learned
5. **The Lesson/Takeaway** (1 sentence): Universal lesson for the audience
6. **Engagement Hook** (1 question): Ask something that invites discussion

TONE & STYLE:
- Personal and authentic, like talking to a colleague
- Mix of vulnerability and confidence
- Technical details without overwhelming jargon
- Self-aware humor where appropriate
- Professional yet conversational

FORMATTING:
- Use emojis strategically (2-3 total) for visual breaks
- Bold key phrases sparingly (1-2 maximum)
- Short paragraphs for mobile readability
- Include 4-6 relevant hashtags at the end

ABSOLUTELY FORBIDDEN:
- Generic advice or platitudes
- Overly promotional language
- Meta-commentary about the post
- Placeholder text in brackets
- Introductory phrases like "Here's my story"

Start immediately with the first word of your story.`,
            contextualAdditions: [
                'Include specific industry context when relevant',
                'Reference career stage and experience level',
                'Adapt complexity to target audience'
            ],
            styleModifiers: {
                formal: 'Use professional language with measured tone',
                casual: 'Use conversational language with personal touches',
                technical: 'Include relevant technical context and terminology',
                inspirational: 'Focus on motivation and positive transformation'
            },
            audienceAdaptations: {
                developers: 'Include technical growth and coding journey elements',
                business: 'Focus on business impact and professional development',
                students: 'Emphasize learning process and educational insights',
                entrepreneurs: 'Highlight innovation, risk-taking, and business building'
            }
        },
        technical: {
            base: `You are writing a technical showcase story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a technical achievement story: {USER_PROMPT}

Write for {USER_NAME} using this TECHNICAL STORY structure:

STORY ARC:
1. **The Technical Challenge** (1-2 sentences): What problem needed solving
2. **The Research/Exploration** (2-3 sentences): Technologies explored, decisions made
3. **The Implementation** (2-3 sentences): Key technical decisions and interesting solutions
4. **The Results** (1-2 sentences): What was built and its impact
5. **The Learning** (1 sentence): Key technical insight gained
6. **Community Question** (1 question): Ask about others' experiences with similar tech

TECHNICAL DEPTH:
- Include specific technologies, frameworks, or methodologies
- Explain complex concepts in accessible terms
- Share actual challenges and how they were overcome
- Mention metrics or concrete results where relevant

TONE:
- Confident but not arrogant
- Educational and helpful to other developers
- Honest about challenges and failures
- Excited about technology and innovation

FORMATTING:
- Use technical terms appropriately
- Bold key technologies or concepts (2-3 maximum)
- Include relevant emojis (2-3 total)
- End with 4-6 technical hashtags

Start immediately with the technical challenge or achievement.`,
            contextualAdditions: [
                'Include relevant tech stack and architecture details',
                'Reference performance metrics and scalability considerations',
                'Mention team collaboration and technical leadership'
            ],
            styleModifiers: {
                formal: 'Use precise technical language with professional tone',
                casual: 'Explain technical concepts in approachable terms',
                technical: 'Include detailed technical specifications and metrics',
                inspirational: 'Focus on innovation and technical breakthrough aspects'
            },
            audienceAdaptations: {
                developers: 'Include code-level insights and development practices',
                business: 'Focus on business value and ROI of technical decisions',
                students: 'Explain learning process and technical growth',
                entrepreneurs: 'Highlight innovation and competitive advantages'
            }
        },
        achievement: {
            base: `You are writing an achievement celebration story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into an achievement story: {USER_PROMPT}

Write for {USER_NAME} using this ACHIEVEMENT STORY structure:

STORY ARC:
1. **The Milestone** (1 sentence): What was achieved
2. **The Journey** (2-3 sentences): Brief story of how you got here
3. **The Challenges** (1-2 sentences): What made this difficult or meaningful
4. **The Team/Support** (1-2 sentences): Who helped or what you learned
5. **The Impact** (1-2 sentences): Why this matters or what's next
6. **Gratitude/Forward Look** (1 question): Thank supporters and ask for engagement

TONE:
- Celebratory but humble
- Grateful and inclusive of others
- Inspiring without being preachy
- Authentic excitement and pride

EMOTIONAL ELEMENTS:
- Share genuine emotions about the achievement
- Include moments of doubt or struggle
- Express gratitude to supporters
- Show excitement for what's next

FORMATTING:
- Use celebratory emojis appropriately (2-4 total)
- Bold the key achievement (1-2 phrases)
- Keep energy high throughout
- End with 4-6 relevant hashtags

Start immediately with the achievement or exciting news.`,
            contextualAdditions: [
                'Include specific metrics or scale of achievement',
                'Reference team contributions and collaboration',
                'Mention lessons learned during the journey'
            ],
            styleModifiers: {
                formal: 'Professional celebration with measured enthusiasm',
                casual: 'Excited and personal celebration with authentic emotion',
                technical: 'Include technical achievements and innovation aspects',
                inspirational: 'Focus on motivation and possibility for others'
            },
            audienceAdaptations: {
                developers: 'Highlight technical milestones and development achievements',
                business: 'Focus on business impact and market success',
                students: 'Emphasize learning achievements and educational milestones',
                entrepreneurs: 'Highlight business building and innovation success'
            }
        },
        learning: {
            base: `You are writing an educational story with personal experience directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a learning/educational story: {USER_PROMPT}

Write for {USER_NAME} using this LEARNING STORY structure:

STORY ARC:
1. **The Discovery** (1-2 sentences): What you learned or discovered
2. **The Context** (1-2 sentences): Why this learning was important
3. **The Process** (2-3 sentences): How you learned it, what surprised you
4. **The Application** (1-2 sentences): How you applied this knowledge
5. **The Insight** (1-2 sentences): Deeper understanding or unexpected connections
6. **Knowledge Sharing** (1 question): Ask others about their experiences

EDUCATIONAL VALUE:
- Share specific, actionable insights
- Include concrete examples or use cases
- Explain complex concepts simply
- Provide practical takeaways for readers

TONE:
- Curious and enthusiastic about learning
- Humble about not knowing everything
- Excited to share knowledge
- Encouraging others to learn

FORMATTING:
- Use learning-focused emojis (2-3 total)
- Bold key concepts or insights (1-2 maximum)
- Structure for easy scanning
- Include 4-6 educational/industry hashtags

Start immediately with the learning or insight.`,
            contextualAdditions: [
                'Include specific examples and practical applications',
                'Reference credible sources or methodologies',
                'Connect to broader industry trends or best practices'
            ],
            styleModifiers: {
                formal: 'Structured educational content with authoritative tone',
                casual: 'Conversational teaching with personal anecdotes',
                technical: 'Detailed technical education with precise explanations',
                inspirational: 'Motivational learning content that encourages growth'
            },
            audienceAdaptations: {
                developers: 'Technical learning with code examples and best practices',
                business: 'Business insights with strategic and operational value',
                students: 'Educational content with learning methodology focus',
                entrepreneurs: 'Business learning with practical startup applications'
            }
        },
        imageContent: {
            base: `You are writing a LinkedIn post directly. Do not include any introductory text, explanations, or meta-commentary.

Create a natural LinkedIn post that incorporates this user's draft text and information from the image analysis.

User's draft text:
{USER_PROMPT}

Image analysis:
{IMAGE_ANALYSIS}

Write using these guidelines:

CONTENT REQUIREMENTS:
- Professional yet conversational tone that sounds natural on LinkedIn
- 1200-2000 characters for optimal engagement
- Start immediately with engaging content - no introductions or explanations
- Seamlessly integrate image insights with the user's draft text
- Industry-relevant insights that demonstrate expertise

STRUCTURE:
- Open with an attention-grabbing first line that hooks readers immediately
- 2-3 short, scannable paragraphs (1-2 sentences each) connecting image to professional insights
- End with an engaging question or call-to-action to drive comments
- Include 3-5 relevant professional hashtags at the end

FORMATTING:
- Use single line breaks between paragraphs for mobile readability
- Minimal use of bold text (only for 1-2 key phrases maximum)
- Include 1-2 relevant emojis sparingly for visual appeal
- Keep paragraphs very short for easy scanning

ABSOLUTELY FORBIDDEN - DO NOT INCLUDE:
- Any introductory phrases like "Here's a LinkedIn post", "Okay, here's", "Draft for", etc.
- Subject lines or email-style headers
- Meta-commentary about the post or guidelines
- Explanatory text before or after the post
- Placeholder text in brackets like [company name], [industry], [link to website], [mention industry/niche]
- Phrases like "Learn more at [website]" or "Register at [link]"
- Any text in square brackets [ ]
- Separators like "---" or "***"
- HTML tags like <br>, <p>, <div>, or any HTML markup (use plain text only)

IMPORTANT: Start your response immediately with the first word of the LinkedIn post content. No preamble, no explanation, just the post itself.`,
            contextualAdditions: [
                'Seamlessly integrate visual elements with professional narrative',
                'Connect image content to broader industry insights',
                'Maintain authentic voice while incorporating visual context'
            ],
            styleModifiers: {
                formal: 'Professional analysis of visual content with measured insights',
                casual: 'Conversational integration of image and personal experience',
                technical: 'Technical analysis of visual elements with professional context',
                inspirational: 'Motivational content that uses visual elements to inspire'
            },
            audienceAdaptations: {
                developers: 'Technical interpretation of visual content with development insights',
                business: 'Business-focused analysis connecting visuals to market opportunities',
                students: 'Educational content that uses visuals to teach concepts',
                entrepreneurs: 'Entrepreneurial insights drawn from visual content and experience'
            }
        }
    };

    /**
     * Generate optimized prompt based on classification and context
     */
    public async generatePrompt(
        userPrompt: string,
        classification: ClassificationResult,
        userContext?: UserContext
    ): Promise<string> {
        const template = this.templates[classification.storyType] || this.templates.journey;

        // Start with base template
        let optimizedPrompt = template.base;

        // Replace placeholders
        optimizedPrompt = optimizedPrompt.replace('{USER_PROMPT}', userPrompt);
        optimizedPrompt = optimizedPrompt.replace('{USER_NAME}', userContext?.name || 'the user');

        // Add contextual enhancements
        optimizedPrompt = this.addContextualEnhancements(optimizedPrompt, template, userContext);

        // Apply style modifications
        optimizedPrompt = this.applyStyleModifications(optimizedPrompt, template, classification, userContext);

        // Add audience-specific adaptations
        optimizedPrompt = this.addAudienceAdaptations(optimizedPrompt, template, classification, userContext);

        // Add universal constraints and quality guidelines
        optimizedPrompt = this.addUniversalConstraints(optimizedPrompt);

        return optimizedPrompt;
    }

    /**
     * Generate optimized prompt for image-based content
     */
    public async generateImageContentPrompt(
        userText: string,
        imageAnalysis: string,
        userContext?: UserContext
    ): Promise<string> {
        const template = this.templates.imageContent;

        // Start with base template
        let optimizedPrompt = template.base;

        // Replace placeholders
        optimizedPrompt = optimizedPrompt.replace('{USER_PROMPT}', userText);
        optimizedPrompt = optimizedPrompt.replace('{IMAGE_ANALYSIS}', imageAnalysis);
        optimizedPrompt = optimizedPrompt.replace('{USER_NAME}', userContext?.name || 'the user');

        // Add contextual enhancements for image content
        if (userContext?.role) {
            optimizedPrompt += `\n\nCONTEXT: Write from the perspective of a ${userContext.role}`;
        }

        if (userContext?.industry) {
            optimizedPrompt += ` in the ${userContext.industry} industry`;
        }

        // Apply style modifications
        const style = userContext?.writingStyle || 'casual';
        const styleModifier = template.styleModifiers[style];
        if (styleModifier) {
            optimizedPrompt += `\n\nSTYLE GUIDANCE: ${styleModifier}`;
        }

        // Add audience-specific adaptations
        if (userContext?.targetAudience) {
            const audienceAdaptation = template.audienceAdaptations[userContext.targetAudience];
            if (audienceAdaptation) {
                optimizedPrompt += `\n\nAUDIENCE FOCUS: ${audienceAdaptation}`;
            }
        }

        return optimizedPrompt;
    }

    /**
     * Add contextual enhancements based on user context
     */
    private addContextualEnhancements(
        prompt: string,
        _template: PromptTemplate,
        userContext?: UserContext
    ): string {
        let enhanced = prompt;

        if (userContext?.role) {
            enhanced += `\n\nCONTEXT: Write from the perspective of a ${userContext.role}`;
        }

        if (userContext?.industry) {
            enhanced += ` in the ${userContext.industry} industry`;
        }

        if (userContext?.previousPosts && userContext.previousPosts.length > 0) {
            enhanced += `\n\nSTYLE REFERENCE: Maintain consistency with this writing style: "${userContext.previousPosts[0].substring(0, 200)}..."`;
        }

        return enhanced;
    }

    /**
     * Apply style modifications based on classification and user preferences
     */
    private applyStyleModifications(
        prompt: string,
        template: PromptTemplate,
        classification: ClassificationResult,
        userContext?: UserContext
    ): string {
        const style = userContext?.writingStyle || this.inferStyleFromClassification(classification);
        const styleModifier = template.styleModifiers[style];

        if (styleModifier) {
            prompt += `\n\nSTYLE GUIDANCE: ${styleModifier}`;
        }

        return prompt;
    }

    /**
     * Add audience-specific adaptations
     */
    private addAudienceAdaptations(
        prompt: string,
        template: PromptTemplate,
        classification: ClassificationResult,
        userContext?: UserContext
    ): string {
        const audience = userContext?.targetAudience || classification.audience;
        const audienceAdaptation = template.audienceAdaptations[audience];

        if (audienceAdaptation) {
            prompt += `\n\nAUDIENCE FOCUS: ${audienceAdaptation}`;
        }

        return prompt;
    }

    /**
     * Add universal constraints and quality guidelines
     */
    private addUniversalConstraints(prompt: string): string {
        return prompt + `

UNIVERSAL CONSTRAINTS:
- Start immediately with the first word of your story (no meta-commentary)
- Use 1200-2000 characters for optimal LinkedIn engagement
- Include 2-3 relevant emojis strategically placed for visual breaks
- End with 4-6 relevant professional hashtags
- Use proper paragraph formatting with natural line breaks
- Keep paragraphs short (1-2 sentences max) for mobile readability
- Maintain professional tone while being authentic and engaging

CONTENT GENERATION RULES:
- Generate properly formatted output with correct line breaks and spacing
- Use natural paragraph formatting - avoid aggressive sentence-level breaking
- Preserve narrative structure and only break paragraphs at major topic transitions
- Create flowing paragraph structure for more professional, engaging posts
- Focus on natural conversation flow rather than rigid formatting

LINKEDIN FORMATTING REQUIREMENTS:
- Use single line breaks between paragraphs for mobile readability
- Break after opening hook for immediate engagement
- Break before key insights, transformations, or important points
- Break before questions or calls to action
- Break before hashtags section
- Use white space strategically for visual appeal and readability

ABSOLUTELY FORBIDDEN - DO NOT INCLUDE:
- Any introductory phrases like "Here's a LinkedIn post", "Okay, here's", "Draft for", etc.
- Subject lines or email-style headers that make posts look like letters
- Meta-commentary about the post, writing process, or guidelines
- Explanatory text before or after the post content
- Placeholder text in brackets like [company name], [industry], [link to website], [mention industry/niche]
- Phrases like "Learn more at [website]" or "Register at [link]"
- Any text in square brackets [ ]
- Separators like "---" or "***"
- Generic advice, platitudes, or clichéd business language
- Overly promotional or sales-focused language
- Wall of text without proper paragraph breaks
- Bold formatting with ** asterisks (use plain text formatting only)
- HTML tags like <br>, <p>, <div>, or any HTML markup (use plain text only)
- Email-like prefixes such as "here's a LinkedIn post draft for [name]"`;
    }

    /**
     * Infer writing style from classification
     */
    private inferStyleFromClassification(classification: ClassificationResult): string {
        switch (classification.tone) {
            case 'analytical': return 'technical';
            case 'celebratory': return 'inspirational';
            case 'formal': return 'formal';
            default: return 'casual';
        }
    }

    /**
     * Get template suggestions for a given classification
     */
    public getTemplateSuggestions(classification: ClassificationResult): string[] {
        const template = this.templates[classification.storyType];
        return template ? template.contextualAdditions : [];
    }

    /**
     * Get available story types
     */
    public getAvailableStoryTypes(): string[] {
        return Object.keys(this.templates);
    }

    /**
     * Get enhanced prompt suggestions based on content type and context
     */
    public getEnhancedSuggestions(
        storyType: string,
        _userContext?: UserContext
    ): {
        contextualTips: string[];
        styleOptions: string[];
        audienceOptions: string[];
    } {
        const template = this.templates[storyType];
        if (!template) {
            return {
                contextualTips: [],
                styleOptions: [],
                audienceOptions: []
            };
        }

        return {
            contextualTips: template.contextualAdditions,
            styleOptions: Object.keys(template.styleModifiers),
            audienceOptions: Object.keys(template.audienceAdaptations)
        };
    }

    /**
     * Validate and optimize user input for better prompt generation
     */
    public optimizeUserInput(userInput: string): {
        optimizedInput: string;
        suggestions: string[];
    } {
        const suggestions: string[] = [];
        let optimizedInput = userInput.trim();

        // Check for common issues and provide suggestions
        if (optimizedInput.length < 20) {
            suggestions.push('Consider adding more context or details to your input for better content generation');
        }

        if (optimizedInput.includes('[') || optimizedInput.includes(']')) {
            suggestions.push('Remove placeholder brackets like [company] or [industry] for cleaner output');
            optimizedInput = optimizedInput.replace(/\[.*?\]/g, '');
        }

        if (optimizedInput.toLowerCase().includes('here is') || optimizedInput.toLowerCase().includes('here\'s')) {
            suggestions.push('Remove introductory phrases - the AI will generate content directly');
            optimizedInput = optimizedInput.replace(/^(here is|here's)\s*/i, '');
        }

        return {
            optimizedInput,
            suggestions
        };
    }
}
