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
            base: `You are writing a compelling LinkedIn journey story directly. Transform this into a personal/professional journey narrative: {USER_PROMPT}

Write for {USER_NAME} using this JOURNEY STORY structure:

NARRATIVE ARC:
1. **The Starting Point** (1-2 sentences): Where the journey began, the initial situation
2. **The Challenge/Catalyst** (1-2 sentences): What prompted change or growth
3. **The Journey/Process** (2-3 sentences): The learning, struggles, discoveries along the way
4. **The Transformation** (1-2 sentences): Key insights, breakthroughs, or changes
5. **The Current State** (1-2 sentences): Where you are now, what was achieved
6. **The Universal Lesson** (1 sentence): Takeaway that resonates with others
7. **Engagement Hook** (1 question): Invite discussion and connection

TONE & AUTHENTICITY:
- Personal and vulnerable, showing real human experience
- Mix of challenges and triumphs for relatability
- Professional growth focus with emotional intelligence
- Self-aware without being self-deprecating
- Inspiring without being preachy

FORMATTING REQUIREMENTS:
- Use short paragraphs (1-2 sentences each)
- Add line breaks between different ideas
- Place emojis strategically to break up text
- Emphasize key insights with strategic placement
- End with engaging question on new line`,
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
            base: `You are writing a technical showcase story directly. Transform this into a compelling technical achievement narrative: {USER_PROMPT}

Write for {USER_NAME} using this TECHNICAL STORY structure:

TECHNICAL NARRATIVE:
1. **The Problem/Challenge** (1-2 sentences): What technical challenge needed solving
2. **The Research Phase** (1-2 sentences): Technologies explored, decisions made
3. **The Architecture/Approach** (2-3 sentences): Key technical decisions and design choices
4. **The Implementation** (2-3 sentences): Interesting solutions, challenges overcome
5. **The Results/Impact** (1-2 sentences): Performance, scalability, user impact
6. **The Learning** (1 sentence): Key technical insight or lesson learned
7. **Community Question** (1 question): Engage others about their technical experiences

TECHNICAL DEPTH:
- Include specific technologies, frameworks, methodologies
- Explain complex concepts in accessible terms
- Share actual metrics, performance improvements, or scale
- Mention interesting technical challenges and solutions
- Balance technical detail with broader business impact

FORMATTING REQUIREMENTS:
- Use short paragraphs (1-2 sentences each)
- Add line breaks between technical concepts
- Emphasize key technical achievements with strategic placement
- Use emojis to make technical content approachable
- End with technical question on new line`,
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
            base: `You are writing an achievement celebration story directly. Transform this into an authentic milestone story: {USER_PROMPT}

Write for {USER_NAME} using this ACHIEVEMENT STORY structure:

CELEBRATION NARRATIVE:
1. **The Milestone** (1 sentence): What was achieved or accomplished
2. **The Journey Context** (2-3 sentences): Brief story of how you got here
3. **The Challenges** (1-2 sentences): What made this difficult or meaningful
4. **The Team/Support** (1-2 sentences): Who helped or what you learned from others
5. **The Impact** (1-2 sentences): Why this matters, what it enables next
6. **The Gratitude** (1-2 sentences): Appreciation for supporters and opportunities
7. **Forward Look** (1 question): What's next or how others can connect

CELEBRATION TONE:
- Genuinely excited but humbly grateful
- Inclusive of team members and supporters
- Authentic pride without arrogance
- Forward-looking and inspiring to others
- Professional celebration with personal touches

FORMATTING REQUIREMENTS:
- Use short paragraphs to build excitement
- Add line breaks between celebration elements
- Emphasize the main achievement with strategic placement
- Use celebration emojis strategically
- End with forward-looking question on new line`,
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
            base: `You are writing an educational story with personal insights directly. Transform this into valuable learning content: {USER_PROMPT}

Write for {USER_NAME} using this LEARNING STORY structure:

EDUCATIONAL NARRATIVE:
1. **The Discovery/Insight** (1-2 sentences): What you learned or discovered
2. **The Context** (1-2 sentences): Why this learning was important or timely
3. **The Learning Process** (2-3 sentences): How you discovered this, what surprised you
4. **The Application** (1-2 sentences): How you've applied this knowledge
5. **The Deeper Understanding** (1-2 sentences): Broader implications or connections
6. **The Practical Value** (1-2 sentences): How others can benefit from this insight
7. **Knowledge Sharing** (1 question): Invite others to share their experiences

EDUCATIONAL VALUE:
- Share specific, actionable insights that others can use
- Include concrete examples or real-world applications
- Explain complex concepts in accessible, practical terms
- Provide genuine value to your professional network
- Balance personal experience with universal applicability

FORMATTING REQUIREMENTS:
- Use short paragraphs for easy scanning
- Add line breaks between key insights
- Emphasize the main learning points with strategic placement
- Use learning emojis to highlight insights
- End with knowledge-sharing question on new line`,
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
- Include 2-3 relevant emojis strategically placed
- End with 4-6 relevant professional hashtags
- CRITICAL: Use proper paragraph breaks - separate ideas with double line breaks
- Keep paragraphs short (1-2 sentences max) for mobile readability
- Maintain professional tone while being authentic and engaging

LINKEDIN FORMATTING RULES:
- Break after opening hook (usually with emoji)
- Break before key insights or transformations
- Break before questions or calls to action
- Break before hashtags
- Use white space strategically for visual appeal

ABSOLUTELY FORBIDDEN:
- Any introductory phrases like "Here's a LinkedIn post", "Draft:", etc.
- Meta-commentary about the post or writing process
- Placeholder text in brackets like [company], [industry], [link]
- Generic advice or clichéd business platitudes
- Overly promotional or sales-focused language
- Wall of text without paragraph breaks
- Bold formatting with ** asterisks (LinkedIn doesn't support this)
- HTML tags like <br>, <p>, <div>, or any HTML markup (use plain text only)`;
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
}
