import { ClassificationResult } from './PromptClassifier.js';

/**
 * Advanced Content Optimization System
 * Production-ready content optimizer with comprehensive analysis,
 * engagement optimization, and LinkedIn-specific enhancements.
 * Designed for maximum LinkedIn performance and user engagement.
 */

export interface OptimizationResult {
    optimizedContent: string;
    optimizations: string[];
    metrics: {
        characterCount: number;
        readabilityScore: number;
        engagementPotential: number;
        professionalismScore: number;
        mobileReadabilityScore: number;
        seoScore: number;
        viralPotential: number;
    };
    suggestions: string[];
    analysis: ContentAnalysis;
}

export interface ContentAnalysis {
    structuralAnalysis: StructuralAnalysis;
    linguisticAnalysis: LinguisticAnalysis;
    engagementAnalysis: EngagementAnalysis;
    linkedinOptimization: LinkedInOptimization;
    qualityMetrics: QualityMetrics;
}

export interface StructuralAnalysis {
    paragraphCount: number;
    averageParagraphLength: number;
    sentenceCount: number;
    averageSentenceLength: number;
    hasProperStructure: boolean;
    structureScore: number;
}

export interface LinguisticAnalysis {
    wordCount: number;
    uniqueWordCount: number;
    lexicalDiversity: number;
    complexityScore: number;
    toneConsistency: number;
    professionalLanguageScore: number;
}

export interface EngagementAnalysis {
    hasQuestion: boolean;
    hasCallToAction: boolean;
    hasPersonalTouch: boolean;
    emojiCount: number;
    emojiPlacement: string[];
    engagementTriggers: string[];
    viralElements: string[];
}

export interface LinkedInOptimization {
    hashtagCount: number;
    hashtagRelevance: number;
    mobileFormatting: number;
    linkedinBestPractices: string[];
    algorithmOptimization: number;
}

export interface QualityMetrics {
    grammarScore: number;
    clarityScore: number;
    coherenceScore: number;
    authenticityScore: number;
    valueScore: number;
}

export class ContentOptimizer {
    private lastOptimizations: string[] = [];

    // LinkedIn-specific optimization rules
    private readonly optimizationRules = {
        characterLimits: {
            optimal: { min: 1200, max: 2000 },
            maximum: 3000,
            warning: 2500
        },
        formatting: {
            maxEmojis: 4,
            maxBoldPhrases: 0, // LinkedIn doesn't support ** bold formatting
            maxHashtags: 6,
            minHashtags: 3
        },
        engagement: {
            questionRequired: true,
            callToActionRequired: true,
            personalTouchRequired: true
        }
    };

    /**
     * Main optimization method - returns optimized content string
     */
    public async optimize(
        content: string,
        classification: ClassificationResult
    ): Promise<string> {
        this.lastOptimizations = [];
        let optimizedContent = content;

        // Step 1: Clean and format content
        optimizedContent = this.cleanContent(optimizedContent);

        // Step 2: Optimize character count
        optimizedContent = this.optimizeLength(optimizedContent);

        // Step 3: Enhance formatting
        optimizedContent = this.optimizeFormatting(optimizedContent);

        // Step 4: Add engagement elements
        optimizedContent = this.enhanceEngagement(optimizedContent, classification);

        // Step 5: Optimize hashtags
        optimizedContent = this.optimizeHashtags(optimizedContent, classification);

        // Step 6: Final quality check
        optimizedContent = this.finalQualityCheck(optimizedContent);

        return optimizedContent;
    }

    /**
     * Advanced optimization method - returns comprehensive analysis and results
     */
    public async optimizeWithAnalysis(
        content: string,
        classification: ClassificationResult
    ): Promise<OptimizationResult> {
        // First optimize the content
        const optimizedContent = await this.optimize(content, classification);

        // Then perform comprehensive analysis
        return {
            optimizedContent,
            optimizations: this.getLastOptimizations(),
            metrics: this.calculateMetrics(optimizedContent),
            suggestions: this.generateSuggestions(optimizedContent, classification),
            analysis: this.analyzeContent(optimizedContent)
        };
    }

    /**
     * Clean and standardize content
     */
    private cleanContent(content: string): string {
        let cleaned = content;

        // Remove meta-commentary
        cleaned = cleaned.replace(/^(Here's|Here is|Draft|Post|LinkedIn post).*?[:]\s*/i, '');
        cleaned = cleaned.replace(/^(Okay,|Alright,|Sure,).*?[:]\s*/i, '');

        // CRITICAL FIX: Convert escaped newline strings to actual newlines
        const beforeNewlineConversion = cleaned;
        cleaned = cleaned.replace(/\\n\\n/g, '\n\n');
        cleaned = cleaned.replace(/\\n/g, '\n');

        if (beforeNewlineConversion !== cleaned) {
            console.log('🔧 ContentOptimizer: Converted escaped newlines to actual line breaks');
        }

        // Convert HTML line breaks to proper line breaks
        cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
        cleaned = cleaned.replace(/<br>\s*/gi, '\n');
        cleaned = cleaned.replace(/\s*<br>/gi, '\n');

        // Remove other HTML tags that might be present
        cleaned = cleaned.replace(/<[^>]*>/g, '');

        // Remove markdown formatting that doesn't work on LinkedIn
        cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
        cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

        // Remove bold formatting (**text**) as LinkedIn doesn't support it
        cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, '$1');

        // Remove any remaining asterisk formatting patterns
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1'); // Single asterisks
        cleaned = cleaned.replace(/\*{3,}(.*?)\*{3,}/g, '$1'); // Triple or more asterisks

        // Add proper paragraph breaks for LinkedIn formatting
        cleaned = this.addLinkedInFormatting(cleaned);

        // Standardize line breaks (after all conversions)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.trim();

        this.lastOptimizations.push('content-cleaning');
        return cleaned;
    }

    /**
     * Optimize content length for LinkedIn
     */
    private optimizeLength(content: string): string {
        const { optimal, maximum } = this.optimizationRules.characterLimits;

        if (content.length > maximum) {
            // Truncate while preserving structure
            const truncated = this.intelligentTruncate(content, maximum);
            this.lastOptimizations.push('length-truncation');
            return truncated;
        }

        if (content.length < optimal.min) {
            // Content is too short - this should be handled by prompt engineering
            this.lastOptimizations.push('length-warning-short');
            console.warn(`Content too short: ${content.length} chars (minimum: ${optimal.min})`);
        }

        return content;
    }

    /**
     * Optimize formatting for LinkedIn
     */
    private optimizeFormatting(content: string): string {
        let formatted = content;

        // Optimize emoji usage
        formatted = this.optimizeEmojis(formatted);

        // Ensure mobile-friendly paragraphs
        formatted = this.optimizeParagraphs(formatted);

        this.lastOptimizations.push('formatting-optimization');
        return formatted;
    }

    /**
     * Enhance engagement elements
     */
    private enhanceEngagement(content: string, classification: ClassificationResult): string {
        let enhanced = content;

        // Ensure there's a question for engagement
        if (!this.hasEngagementQuestion(enhanced)) {
            enhanced = this.addEngagementQuestion(enhanced, classification);
            this.lastOptimizations.push('engagement-question-added');
        }

        // Ensure personal touch
        if (!this.hasPersonalTouch(enhanced)) {
            this.lastOptimizations.push('personal-touch-warning');
        }

        return enhanced;
    }

    /**
     * Optimize hashtags
     */
    private optimizeHashtags(content: string, classification: ClassificationResult): string {
        const hashtagPattern = /#\w+/g;
        const existingHashtags = content.match(hashtagPattern) || [];

        if (existingHashtags.length < this.optimizationRules.formatting.minHashtags) {
            const suggestedHashtags = this.generateHashtags(classification);
            const hashtagsToAdd = suggestedHashtags.slice(0,
                this.optimizationRules.formatting.minHashtags - existingHashtags.length
            );

            if (hashtagsToAdd.length > 0) {
                content += '\n\n' + hashtagsToAdd.join(' ');
                this.lastOptimizations.push('hashtags-added');
            }
        }

        if (existingHashtags.length > this.optimizationRules.formatting.maxHashtags) {
            // Remove excess hashtags
            const hashtagsToKeep = existingHashtags.slice(0, this.optimizationRules.formatting.maxHashtags);
            content = content.replace(hashtagPattern, '');
            content += '\n\n' + hashtagsToKeep.join(' ');
            this.lastOptimizations.push('hashtags-trimmed');
        }

        return content;
    }

    /**
     * Final quality check and adjustments
     */
    private finalQualityCheck(content: string): string {
        let final = content;

        // CRITICAL: Final check for any remaining escaped newlines
        const beforeFinalNewlineCheck = final;
        final = final.replace(/\\n\\n/g, '\n\n');
        final = final.replace(/\\n/g, '\n');

        if (beforeFinalNewlineCheck !== final) {
            console.log('🔧 ContentOptimizer: Final cleanup - converted remaining escaped newlines');
        }

        // Also handle any other common escape sequences
        final = final.replace(/\\t/g, '\t');
        final = final.replace(/\\r/g, '\r');

        // Ensure proper spacing
        final = final.replace(/\n{3,}/g, '\n\n');
        // Fix multiple spaces but preserve line breaks - only target spaces that are not part of line breaks
        final = final.replace(/[ \t]{2,}/g, ' ');

        // Ensure content ends properly
        if (!final.match(/[.!?]$/)) {
            final += '.';
        }

        // Remove any remaining placeholder text
        final = final.replace(/\[.*?\]/g, '');

        this.lastOptimizations.push('final-quality-check');
        return final.trim();
    }

    /**
     * Intelligent content truncation
     */
    private intelligentTruncate(content: string, maxLength: number): string {
        if (content.length <= maxLength) return content;

        // Try to truncate at sentence boundaries
        const sentences = content.split(/[.!?]+/);
        let truncated = '';

        for (const sentence of sentences) {
            if ((truncated + sentence).length > maxLength - 50) break;
            truncated += sentence + '.';
        }

        // Ensure we have hashtags at the end
        const hashtagMatch = content.match(/#\w+.*$/);
        if (hashtagMatch && truncated.length + hashtagMatch[0].length < maxLength) {
            truncated += '\n\n' + hashtagMatch[0];
        }

        return truncated;
    }

    /**
     * Optimize emoji usage
     */
    private optimizeEmojis(content: string): string {
        const emojiPattern = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
        const emojis = content.match(emojiPattern) || [];

        if (emojis.length > this.optimizationRules.formatting.maxEmojis) {
            // Remove excess emojis, keeping the first few
            let emojiCount = 0;
            content = content.replace(emojiPattern, (match) => {
                emojiCount++;
                return emojiCount <= this.optimizationRules.formatting.maxEmojis ? match : '';
            });
        }

        return content;
    }



    /**
     * Optimize paragraph structure for mobile and LinkedIn readability
     * More conservative approach that preserves natural flow
     */
    private optimizeParagraphs(content: string): string {
        // If content already has good paragraph structure, preserve it
        const existingParagraphs = content.split('\n\n').filter(p => p.trim().length > 0);

        // If already well-structured, just clean it up
        if (existingParagraphs.length >= 2 && this.hasGoodParagraphStructure(existingParagraphs)) {
            return existingParagraphs.map(p => p.trim()).join('\n\n');
        }

        // Only restructure if really needed
        return this.intelligentParagraphBreaking(content);
    }

    /**
     * Check if existing paragraph structure is good
     */
    private hasGoodParagraphStructure(paragraphs: string[]): boolean {
        // Check if paragraphs have reasonable length distribution
        const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
        const hasVariety = paragraphs.some(p => p.length < 300) && paragraphs.some(p => p.length > 100);

        return avgLength < 500 && hasVariety && paragraphs.length >= 2;
    }

    /**
     * More intelligent paragraph breaking that preserves natural flow
     */
    private intelligentParagraphBreaking(content: string): string {
        // Split into logical thought units instead of arbitrary sentence breaks
        const thoughtUnits = this.identifyThoughtUnits(content);

        if (thoughtUnits.length <= 1) {
            return content; // Keep as single paragraph if it's cohesive
        }

        // Group related thought units into paragraphs
        const paragraphs = this.groupIntoNaturalParagraphs(thoughtUnits);

        return paragraphs.map(p => p.trim()).join('\n\n');
    }

    /**
     * Identify natural thought units in content
     */
    private identifyThoughtUnits(content: string): string[] {
        const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
        const thoughtUnits: string[] = [];
        let currentUnit = '';

        for (let i = 0; i < sentences.length; i++) {
            const sentence = sentences[i].trim();
            const nextSentence = sentences[i + 1];

            currentUnit += (currentUnit ? ' ' : '') + sentence;

            // Only break on major topic shifts, not every sentence
            if (this.isMajorTopicShift(sentence, nextSentence, currentUnit)) {
                thoughtUnits.push(currentUnit);
                currentUnit = '';
            }
        }

        if (currentUnit.trim()) {
            thoughtUnits.push(currentUnit);
        }

        return thoughtUnits;
    }

    /**
     * Determine if there's a major topic shift (much more conservative)
     */
    private isMajorTopicShift(currentSentence: string, nextSentence: string, currentUnit: string): boolean {
        if (!nextSentence) return true; // End of content

        // Only break on strong narrative transitions
        const strongTransitions = [
            /^(But here's the thing|However, here's what I learned|The real challenge|What I discovered|The truth is)/i,
            /^(Fast forward|Years later|Looking back|In hindsight)/i,
            /^(Here's what happened|This changed everything|That's when I realized)/i
        ];

        // Only break if current unit is substantial AND there's a strong transition
        if (currentUnit.length > 400 && strongTransitions.some(pattern => pattern.test(nextSentence))) {
            return true;
        }

        // Break before direct questions that ask for engagement (usually at the end)
        if (nextSentence.includes('?') &&
            /\b(what are your thoughts|what do you think|share your|tell me about)\b/i.test(nextSentence) &&
            currentUnit.length > 300) {
            return true;
        }

        // Break if current unit is very long (over 700 chars) and there's any transition
        if (currentUnit.length > 700 && /^(So|Now|This|That's|The)/i.test(nextSentence)) {
            return true;
        }

        return false;
    }

    /**
     * Group thought units into natural paragraphs
     */
    private groupIntoNaturalParagraphs(thoughtUnits: string[]): string[] {
        if (thoughtUnits.length <= 3) {
            return thoughtUnits; // Keep as separate paragraphs if few units
        }

        const paragraphs: string[] = [];
        let currentParagraph = '';

        for (let i = 0; i < thoughtUnits.length; i++) {
            const unit = thoughtUnits[i];
            const combinedLength = currentParagraph.length + unit.length;

            // Start new paragraph if current would be too long
            if (combinedLength > 600 && currentParagraph.length > 0) {
                paragraphs.push(currentParagraph.trim());
                currentParagraph = unit;
            } else {
                currentParagraph += (currentParagraph ? '\n\n' : '') + unit;
            }
        }

        if (currentParagraph.trim()) {
            paragraphs.push(currentParagraph.trim());
        }

        return paragraphs;
    }



    /**
     * Check if content has an engagement question
     */
    private hasEngagementQuestion(content: string): boolean {
        return /\?[^?]*$/.test(content.trim());
    }

    /**
     * Add an appropriate engagement question
     */
    private addEngagementQuestion(content: string, classification: ClassificationResult): string {
        const questions = {
            journey: "What's been your biggest career transformation? Share your story below! 👇",
            technical: "What's your experience with similar technical challenges? Let's discuss! 💬",
            achievement: "What milestone are you celebrating this year? I'd love to hear about it! 🎉",
            learning: "What's the most valuable lesson you've learned recently? Share your insights! 💡",
            general: "What are your thoughts on this? I'd love to hear your perspective! 💭"
        };

        const question = questions[classification.storyType as keyof typeof questions] || questions.general;
        return content + '\n\n' + question;
    }

    /**
     * Check if content has personal touch
     */
    private hasPersonalTouch(content: string): boolean {
        const personalIndicators = /\b(I|my|me|myself|we|our|us)\b/i;
        return personalIndicators.test(content);
    }

    /**
     * Generate relevant hashtags
     */
    private generateHashtags(classification: ClassificationResult): string[] {
        const baseHashtags = ['#LinkedIn', '#Professional'];

        const storyTypeHashtags = {
            journey: ['#CareerGrowth', '#PersonalDevelopment', '#ProfessionalJourney'],
            technical: ['#TechInnovation', '#SoftwareDevelopment', '#TechLeadership'],
            achievement: ['#Milestone', '#Success', '#Achievement'],
            learning: ['#Learning', '#Growth', '#Insights'],
            general: ['#Networking', '#Business', '#Growth']
        };

        const audienceHashtags = {
            developers: ['#Developers', '#Coding', '#Programming'],
            business: ['#Business', '#Leadership', '#Strategy'],
            students: ['#Students', '#Education', '#Learning'],
            entrepreneurs: ['#Entrepreneurship', '#Startup', '#Innovation'],
            general: ['#Community', '#Networking']
        };

        return [
            ...baseHashtags,
            ...storyTypeHashtags[classification.storyType as keyof typeof storyTypeHashtags] || storyTypeHashtags.general,
            ...audienceHashtags[classification.audience as keyof typeof audienceHashtags] || audienceHashtags.general
        ].slice(0, 6);
    }

    /**
     * Get the optimizations applied in the last run
     */
    public getLastOptimizations(): string[] {
        return [...this.lastOptimizations];
    }

    /**
     * Calculate comprehensive content metrics
     */
    public calculateMetrics(content: string): OptimizationResult['metrics'] {
        return {
            characterCount: content.length,
            readabilityScore: this.calculateReadabilityScore(content),
            engagementPotential: this.calculateEngagementPotential(content),
            professionalismScore: this.calculateProfessionalismScore(content),
            mobileReadabilityScore: this.calculateMobileReadabilityScore(content),
            seoScore: this.calculateSEOScore(content),
            viralPotential: this.calculateViralPotential(content)
        };
    }

    private calculateReadabilityScore(content: string): number {
        // Simple readability calculation based on sentence length and word complexity
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);

        const avgSentenceLength = words.length / sentences.length;
        const complexWords = words.filter(w => w.length > 6).length;
        const complexityRatio = complexWords / words.length;

        // Score from 0-100, higher is more readable
        return Math.max(0, 100 - (avgSentenceLength * 2) - (complexityRatio * 50));
    }

    private calculateEngagementPotential(content: string): number {
        let score = 50; // Base score

        // Positive factors
        if (this.hasEngagementQuestion(content)) score += 20;
        if (this.hasPersonalTouch(content)) score += 15;
        if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu.test(content)) score += 10;
        if (/#\w+/.test(content)) score += 10;
        if (/\*\*(.*?)\*\*/.test(content)) score += 5;

        // Negative factors
        if (content.length > 2000) score -= 10;
        if (content.length < 500) score -= 15;

        return Math.min(100, Math.max(0, score));
    }

    private calculateProfessionalismScore(content: string): number {
        let score = 80; // Base professional score

        // Check for professional language
        const unprofessionalWords = /\b(awesome|amazing|incredible|mind-blowing|crazy|insane)\b/gi;
        const matches = content.match(unprofessionalWords);
        if (matches) score -= matches.length * 5;

        // Check for proper structure
        if (content.split('\n\n').length < 2) score -= 10;
        if (!/#\w+/.test(content)) score -= 5;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate mobile readability score
     */
    private calculateMobileReadabilityScore(content: string): number {
        let score = 80; // Base score

        const paragraphs = content.split('\n\n');
        const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;

        // Shorter paragraphs are better for mobile
        if (avgParagraphLength < 100) score += 15;
        else if (avgParagraphLength < 150) score += 10;
        else if (avgParagraphLength > 200) score -= 15;

        // Check for proper line breaks
        if (paragraphs.length >= 3) score += 10;
        if (paragraphs.length < 2) score -= 20;

        // Emoji usage helps mobile engagement
        const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu) || []).length;
        if (emojiCount >= 2 && emojiCount <= 4) score += 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate SEO score for LinkedIn algorithm
     */
    private calculateSEOScore(content: string): number {
        let score = 50; // Base score

        // Hashtag optimization
        const hashtags = content.match(/#\w+/g) || [];
        if (hashtags.length >= 3 && hashtags.length <= 6) score += 20;
        else if (hashtags.length > 6) score -= 10;

        // Keyword density (professional terms)
        const professionalKeywords = [
            'leadership', 'innovation', 'growth', 'success', 'team', 'project',
            'development', 'strategy', 'experience', 'learning', 'achievement'
        ];
        const keywordCount = professionalKeywords.filter(keyword =>
            content.toLowerCase().includes(keyword)
        ).length;
        score += Math.min(keywordCount * 5, 25);

        // Content length optimization
        if (content.length >= 1200 && content.length <= 2000) score += 15;
        else if (content.length < 800) score -= 20;

        // Engagement elements
        if (content.includes('?')) score += 10; // Questions boost algorithm
        if (/\b(share|comment|thoughts|experience)\b/i.test(content)) score += 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate viral potential score
     */
    private calculateViralPotential(content: string): number {
        let score = 30; // Base score

        // Emotional triggers
        const emotionalWords = [
            'amazing', 'incredible', 'shocked', 'surprised', 'excited', 'thrilled',
            'grateful', 'proud', 'inspired', 'motivated', 'breakthrough', 'transformation'
        ];
        const emotionalCount = emotionalWords.filter(word =>
            content.toLowerCase().includes(word)
        ).length;
        score += Math.min(emotionalCount * 8, 30);

        // Story elements
        if (/\b(journey|story|experience|transformation)\b/i.test(content)) score += 15;
        if (/\b(first time|never thought|couldn't believe)\b/i.test(content)) score += 10;

        // Numbers and metrics (people love data)
        const numberMatches = content.match(/\d+[%x]|\$\d+|\d+\s*(million|thousand|k)/gi) || [];
        score += Math.min(numberMatches.length * 10, 25);

        // Controversy/debate potential
        if (/\b(unpopular opinion|controversial|disagree|debate)\b/i.test(content)) score += 15;

        // Call to action strength
        if (/\b(share your|what's your|tell me about|comment below)\b/i.test(content)) score += 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Add proper LinkedIn formatting with strategic paragraph breaks
     * More conservative approach that preserves natural flow
     */
    private addLinkedInFormatting(content: string): string {
        // If content already has good paragraph breaks, preserve them
        if (content.includes('\n\n')) {
            return content;
        }

        // Split content into sentences
        const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

        // Keep short content as single paragraph
        if (sentences.length <= 4 || content.length < 800) {
            return content;
        }

        // Use the intelligent paragraph breaking for better flow
        return this.intelligentParagraphBreaking(content);
    }

    /**
     * Determine if we should start a new paragraph (much more conservative)
     */
    private shouldStartNewParagraph(
        sentence: string,
        currentParagraph: string,
        sentenceCount: number,
        index: number,
        allSentences: string[]
    ): boolean {
        // Only break before final engagement questions (last 1-2 sentences)
        if (sentence.includes('?') &&
            index >= allSentences.length - 2 &&
            /\b(what are your thoughts|what do you think|share your|tell me about)\b/i.test(sentence) &&
            currentParagraph.length > 300) {
            return true;
        }

        // Only break on very strong narrative transitions AND substantial content
        const veryStrongTransitions = [
            /^(But here's the thing|However, here's what I learned|The real challenge|What I discovered)/i,
            /^(Fast forward|Years later|Looking back|That's when I realized)/i,
            /^(This changed everything|Here's what happened)/i
        ];

        if (veryStrongTransitions.some(pattern => pattern.test(sentence)) &&
            currentParagraph.length > 400 &&
            sentenceCount >= 3) {
            return true;
        }

        // Only break if paragraph is extremely long (>600 chars) AND has many sentences
        if (currentParagraph.length > 600 && sentenceCount >= 6) {
            return true;
        }

        // Break before conclusion with specific emotional emojis only if paragraph is substantial
        if (/[🎉🏆🎊]$/.test(sentence) &&
            sentenceCount >= 3 &&
            currentParagraph.length > 350 &&
            index >= allSentences.length - 3) {
            return true;
        }

        return false;
    }

    /**
     * Perform comprehensive content analysis
     */
    public analyzeContent(content: string): ContentAnalysis {
        return {
            structuralAnalysis: this.performStructuralAnalysis(content),
            linguisticAnalysis: this.performLinguisticAnalysis(content),
            engagementAnalysis: this.performEngagementAnalysis(content),
            linkedinOptimization: this.performLinkedInOptimization(content),
            qualityMetrics: this.performQualityAnalysis(content)
        };
    }

    /**
     * Analyze content structure
     */
    private performStructuralAnalysis(content: string): StructuralAnalysis {
        const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);

        const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

        const hasProperStructure = paragraphs.length >= 3 && avgParagraphLength < 200;
        const structureScore = this.calculateStructureScore(paragraphs, sentences);

        return {
            paragraphCount: paragraphs.length,
            averageParagraphLength: Math.round(avgParagraphLength),
            sentenceCount: sentences.length,
            averageSentenceLength: Math.round(avgSentenceLength),
            hasProperStructure,
            structureScore
        };
    }

    /**
     * Analyze linguistic properties
     */
    private performLinguisticAnalysis(content: string): LinguisticAnalysis {
        const words = content.toLowerCase().match(/\b\w+\b/g) || [];
        const uniqueWords = new Set(words);

        const lexicalDiversity = uniqueWords.size / words.length;
        const complexityScore = this.calculateComplexityScore(content);
        const toneConsistency = this.calculateToneConsistency(content);
        const professionalLanguageScore = this.calculateProfessionalLanguageScore(content);

        return {
            wordCount: words.length,
            uniqueWordCount: uniqueWords.size,
            lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
            complexityScore,
            toneConsistency,
            professionalLanguageScore
        };
    }

    /**
     * Analyze engagement elements
     */
    private performEngagementAnalysis(content: string): EngagementAnalysis {
        const hasQuestion = content.includes('?');
        const hasCallToAction = /\b(share|comment|thoughts|tell me|what do you think)\b/i.test(content);
        const hasPersonalTouch = /\b(I|my|me|personally|experience)\b/i.test(content);

        const emojiMatches = content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu) || [];
        const emojiPlacement = this.analyzeEmojiPlacement(content);
        const engagementTriggers = this.identifyEngagementTriggers(content);
        const viralElements = this.identifyViralElements(content);

        return {
            hasQuestion,
            hasCallToAction,
            hasPersonalTouch,
            emojiCount: emojiMatches.length,
            emojiPlacement,
            engagementTriggers,
            viralElements
        };
    }

    /**
     * Analyze LinkedIn-specific optimization
     */
    private performLinkedInOptimization(content: string): LinkedInOptimization {
        const hashtags = content.match(/#\w+/g) || [];
        const hashtagRelevance = this.calculateHashtagRelevance(hashtags);
        const mobileFormatting = this.calculateMobileReadabilityScore(content);
        const linkedinBestPractices = this.identifyLinkedInBestPractices(content);
        const algorithmOptimization = this.calculateSEOScore(content);

        return {
            hashtagCount: hashtags.length,
            hashtagRelevance,
            mobileFormatting,
            linkedinBestPractices,
            algorithmOptimization
        };
    }

    /**
     * Analyze content quality metrics
     */
    private performQualityAnalysis(content: string): QualityMetrics {
        return {
            grammarScore: this.calculateGrammarScore(content),
            clarityScore: this.calculateClarityScore(content),
            coherenceScore: this.calculateCoherenceScore(content),
            authenticityScore: this.calculateAuthenticityScore(content),
            valueScore: this.calculateValueScore(content)
        };
    }

    // ===== HELPER METHODS FOR ADVANCED ANALYSIS =====

    /**
     * Calculate structure score based on paragraphs and sentences
     */
    private calculateStructureScore(paragraphs: string[], sentences: string[]): number {
        let score = 50;

        // Paragraph count optimization
        if (paragraphs.length >= 3 && paragraphs.length <= 6) score += 20;
        else if (paragraphs.length < 2) score -= 30;

        // Paragraph length consistency
        const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
        if (avgLength < 150) score += 15;
        else if (avgLength > 250) score -= 15;

        // Sentence variety
        const sentenceLengths = sentences.map(s => s.length);
        const variance = this.calculateVariance(sentenceLengths);
        if (variance > 100) score += 10; // Good sentence variety

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate complexity score
     */
    private calculateComplexityScore(content: string): number {
        let score = 50;

        // Word length analysis
        const words = content.match(/\b\w+\b/g) || [];
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

        if (avgWordLength > 6) score += 15; // More complex vocabulary
        else if (avgWordLength < 4) score -= 10;

        // Technical terms
        const technicalTerms = [
            'algorithm', 'architecture', 'framework', 'methodology', 'optimization',
            'implementation', 'infrastructure', 'scalability', 'performance'
        ];
        const techCount = technicalTerms.filter(term =>
            content.toLowerCase().includes(term)
        ).length;
        score += Math.min(techCount * 8, 25);

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate tone consistency
     */
    private calculateToneConsistency(content: string): number {
        let score = 70;

        // Check for mixed tones (professional vs casual)
        const professionalWords = ['furthermore', 'therefore', 'consequently', 'moreover'];
        const casualWords = ['awesome', 'cool', 'amazing', 'super', 'totally'];

        const profCount = professionalWords.filter(word =>
            content.toLowerCase().includes(word)
        ).length;
        const casualCount = casualWords.filter(word =>
            content.toLowerCase().includes(word)
        ).length;

        // Consistent tone is better
        if (Math.abs(profCount - casualCount) <= 1) score += 20;
        else score -= 15;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate professional language score
     */
    private calculateProfessionalLanguageScore(content: string): number {
        let score = 50;

        const professionalIndicators = [
            'experience', 'expertise', 'leadership', 'strategy', 'innovation',
            'development', 'growth', 'achievement', 'collaboration', 'excellence'
        ];

        const indicatorCount = professionalIndicators.filter(indicator =>
            content.toLowerCase().includes(indicator)
        ).length;

        score += Math.min(indicatorCount * 8, 40);

        // Avoid overly casual language
        const casualPhrases = ['like totally', 'super duper', 'omg', 'lol'];
        const casualCount = casualPhrases.filter(phrase =>
            content.toLowerCase().includes(phrase)
        ).length;
        score -= casualCount * 15;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Analyze emoji placement
     */
    private analyzeEmojiPlacement(content: string): string[] {
        const placements: string[] = [];
        const lines = content.split('\n');

        lines.forEach((line, index) => {
            if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu.test(line)) {
                if (index === 0) placements.push('opening');
                else if (index === lines.length - 1) placements.push('closing');
                else placements.push('middle');
            }
        });

        return placements;
    }

    /**
     * Identify engagement triggers
     */
    private identifyEngagementTriggers(content: string): string[] {
        const triggers = [];

        if (content.includes('?')) triggers.push('question');
        if (/\b(share|comment|thoughts)\b/i.test(content)) triggers.push('call-to-action');
        if (/\b(agree|disagree|opinion)\b/i.test(content)) triggers.push('opinion-seeking');
        if (/\b(experience|story|journey)\b/i.test(content)) triggers.push('personal-story');
        if (/\d+[%x]|\$\d+/g.test(content)) triggers.push('metrics');

        return triggers;
    }

    /**
     * Identify viral elements
     */
    private identifyViralElements(content: string): string[] {
        const elements = [];

        if (/\b(shocking|surprising|incredible|unbelievable)\b/i.test(content)) {
            elements.push('surprise-factor');
        }
        if (/\b(first time|never|always)\b/i.test(content)) {
            elements.push('extremes');
        }
        if (/\b(secret|hack|trick|tip)\b/i.test(content)) {
            elements.push('insider-knowledge');
        }
        if (/\b(mistake|failure|lesson)\b/i.test(content)) {
            elements.push('vulnerability');
        }

        return elements;
    }

    /**
     * Calculate hashtag relevance
     */
    private calculateHashtagRelevance(hashtags: string[]): number {
        let score = 50;

        const relevantHashtags = [
            '#leadership', '#innovation', '#technology', '#growth', '#success',
            '#teamwork', '#development', '#strategy', '#experience', '#learning'
        ];

        const relevantCount = hashtags.filter(tag =>
            relevantHashtags.includes(tag.toLowerCase())
        ).length;

        score += Math.min(relevantCount * 15, 40);

        // Penalize irrelevant or spammy hashtags
        const spammyHashtags = ['#follow', '#like', '#followme', '#viral'];
        const spammyCount = hashtags.filter(tag =>
            spammyHashtags.includes(tag.toLowerCase())
        ).length;
        score -= spammyCount * 20;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Identify LinkedIn best practices
     */
    private identifyLinkedInBestPractices(content: string): string[] {
        const practices = [];

        if (content.includes('?')) practices.push('includes-question');
        if (content.split('\n\n').length >= 3) practices.push('proper-paragraphs');
        if ((content.match(/#\w+/g) || []).length >= 3) practices.push('adequate-hashtags');
        if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]/gu.test(content)) practices.push('emoji-usage');
        if (content.length >= 1200) practices.push('optimal-length');
        if (/\b(I|my|me)\b/i.test(content)) practices.push('personal-touch');

        return practices;
    }

    /**
     * Calculate grammar score
     */
    private calculateGrammarScore(content: string): number {
        let score = 80; // Base score

        // Check for common grammar issues (future enhancement)
        // const grammarIssues = [
        //     /\b(there|their|they're)\b/gi, // Common confusion
        //     /\b(your|you're)\b/gi,
        //     /\b(its|it's)\b/gi
        // ];

        // Simple grammar checks
        if (!/[.!?]$/.test(content.trim())) score -= 10; // Missing end punctuation
        if (/\s{2,}/.test(content)) score -= 5; // Multiple spaces
        if (/[A-Z]{3,}/.test(content)) score -= 10; // Excessive caps

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate clarity score
     */
    private calculateClarityScore(content: string): number {
        let score = 70;

        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;

        // Shorter sentences are clearer
        if (avgSentenceLength < 80) score += 20;
        else if (avgSentenceLength > 120) score -= 15;

        // Check for clarity indicators
        if (/\b(specifically|clearly|obviously|simply)\b/i.test(content)) score += 10;
        if (/\b(however|therefore|consequently)\b/i.test(content)) score += 5;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate coherence score
     */
    private calculateCoherenceScore(content: string): number {
        let score = 70;

        const paragraphs = content.split('\n\n');

        // Check for logical flow
        const transitionWords = ['first', 'then', 'next', 'finally', 'however', 'therefore'];
        const transitionCount = transitionWords.filter(word =>
            content.toLowerCase().includes(word)
        ).length;

        score += Math.min(transitionCount * 8, 20);

        // Consistent theme
        if (paragraphs.length > 1) {
            const firstParagraph = paragraphs[0].toLowerCase();
            const lastParagraph = paragraphs[paragraphs.length - 1].toLowerCase();

            // Check for thematic consistency (simple keyword overlap)
            const firstWords = (firstParagraph.match(/\b\w{4,}\b/g) || []) as string[];
            const lastWords = (lastParagraph.match(/\b\w{4,}\b/g) || []) as string[];
            const overlap = firstWords.filter(word => lastWords.includes(word)).length;

            if (overlap > 0) score += 10;
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate authenticity score
     */
    private calculateAuthenticityScore(content: string): number {
        let score = 60;

        // Personal pronouns indicate authenticity
        const personalPronouns = (content.match(/\b(I|my|me|myself)\b/gi) || []).length;
        score += Math.min(personalPronouns * 5, 25);

        // Specific details add authenticity
        const specificDetails = (content.match(/\d+|specific|exactly|precisely/gi) || []).length;
        score += Math.min(specificDetails * 3, 15);

        // Avoid generic business speak
        const genericPhrases = ['synergy', 'leverage', 'paradigm', 'disrupt', 'game-changer'];
        const genericCount = genericPhrases.filter(phrase =>
            content.toLowerCase().includes(phrase)
        ).length;
        score -= genericCount * 10;

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Calculate value score
     */
    private calculateValueScore(content: string): number {
        let score = 50;

        // Educational content
        const educationalWords = ['learn', 'tip', 'advice', 'insight', 'lesson', 'experience'];
        const educationalCount = educationalWords.filter(word =>
            content.toLowerCase().includes(word)
        ).length;
        score += Math.min(educationalCount * 8, 30);

        // Actionable content
        if (/\b(how to|step|process|method)\b/i.test(content)) score += 15;
        if (/\b(avoid|prevent|improve|optimize)\b/i.test(content)) score += 10;

        // Specific metrics or results
        const metrics = (content.match(/\d+[%x]|\$\d+|\d+\s*(million|thousand|k)/gi) || []).length;
        score += Math.min(metrics * 10, 20);

        return Math.min(100, Math.max(0, score));
    }

    /**
     * Generate optimization suggestions
     */
    public generateSuggestions(content: string, classification: ClassificationResult): string[] {
        const suggestions: string[] = [];
        const metrics = this.calculateMetrics(content);

        // Character count suggestions
        if (metrics.characterCount < 1200) {
            suggestions.push('Consider expanding content to 1200-2000 characters for better LinkedIn engagement');
        } else if (metrics.characterCount > 2500) {
            suggestions.push('Content is quite long - consider breaking into multiple posts for better readability');
        }

        // Readability suggestions
        if (metrics.readabilityScore < 60) {
            suggestions.push('Use shorter sentences and simpler words to improve readability');
        }

        // Engagement suggestions
        if (metrics.engagementPotential < 70) {
            if (!content.includes('?')) {
                suggestions.push('Add an engaging question to encourage comments and interaction');
            }
            if (!/\b(I|my|me)\b/i.test(content)) {
                suggestions.push('Add personal experiences or insights to make content more relatable');
            }
        }

        // Mobile readability suggestions
        if (metrics.mobileReadabilityScore < 70) {
            suggestions.push('Break content into shorter paragraphs for better mobile readability');
        }

        // SEO suggestions
        if (metrics.seoScore < 60) {
            const hashtags = content.match(/#\w+/g) || [];
            if (hashtags.length < 3) {
                suggestions.push('Add 3-6 relevant hashtags to improve discoverability');
            }
            if (!/\b(share|comment|thoughts|experience)\b/i.test(content)) {
                suggestions.push('Include call-to-action words like "share", "comment", or "thoughts"');
            }
        }

        // Viral potential suggestions
        if (metrics.viralPotential < 50) {
            suggestions.push('Consider adding specific metrics, numbers, or surprising insights to increase viral potential');
            if (!/\b(story|journey|experience|transformation)\b/i.test(content)) {
                suggestions.push('Share a personal story or transformation to create emotional connection');
            }
        }

        // Professional tone suggestions
        if (metrics.professionalismScore < 70) {
            suggestions.push('Review language for professional tone while maintaining authenticity');
        }

        return suggestions;
    }

    /**
     * Calculate variance for array of numbers
     */
    private calculateVariance(numbers: number[]): number {
        const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
        const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
        return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
    }
}
