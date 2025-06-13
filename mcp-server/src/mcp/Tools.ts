import axios from "axios";
import Logger from "../utils/Logger.js";
import { AIOrchestrator } from "../ai/AIOrchestrator.js";
import { DraftTools } from "../tools/DraftTools.js";
import { SchedulingTools } from "../tools/SchedulingTools.js";
import { AnalyticsTools } from "../tools/AnalyticsTools.js";
import { ActivityTools } from "../tools/ActivityTools.js";
import { LinkScrapingTools } from "../tools/LinkScrapingTools.js";

// Define CallToolResult interface since we can't import it
interface CallToolContent {
    type: string;
    text: string;
}

interface CallToolResult {
    content: CallToolContent[];
    isError?: boolean;
}

// Define OAuthTokens interface
interface OAuthTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}

export class Tools {
    // LinkedIn API version to use for all requests - updated to latest based on deprecation timeline
    private readonly LINKEDIN_API_VERSION = '202505'; // Most current version as of May 2025
    private readonly LINKEDIN_PROTOCOL_VERSION = '2.0.0';

    // Define field projections to match permission scopes
    private readonly BASE_FIELDS = '(id,localizedFirstName,localizedLastName)';
    private readonly PROFILE_PIC_FIELDS = 'profilePicture(displayImage~:playableStreams)';
    private readonly EMAIL_FIELDS = 'emailAddress';

    // AI Orchestration system for intelligent content generation
    public aiOrchestrator: AIOrchestrator;

    // New feature tool instances
    public draftTools: DraftTools;
    public schedulingTools: SchedulingTools;
    public analyticsTools: AnalyticsTools;
    public activityTools: ActivityTools;
    public linkScrapingTools: LinkScrapingTools;

    constructor() {
        this.aiOrchestrator = new AIOrchestrator();

        // Initialize new feature tools
        this.draftTools = new DraftTools();
        this.schedulingTools = new SchedulingTools();
        this.analyticsTools = new AnalyticsTools();
        this.activityTools = new ActivityTools();
        this.linkScrapingTools = new LinkScrapingTools();
    }

    /**
     * Helper method to get headers specifically for OpenID Connect endpoints
     * These endpoints don't require LinkedIn-Version header
     */
    private getOpenIDHeaders(accessToken: string) {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
            // Note: OpenID Connect endpoints don't use LinkedIn-Version or X-Restli-Protocol-Version
        };
    }

    /**
     * Get user profile information using OpenID Connect userinfo endpoint
     * This endpoint is recommended for Sign In with LinkedIn via OpenID Connect
     */
    private async getUserInfoWithOpenID(accessToken: string): Promise<any> {
        try {
            const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
                headers: this.getOpenIDHeaders(accessToken)
            });

            return {
                id: response.data.sub,
                firstName: response.data.given_name || '',
                lastName: response.data.family_name || '',
                profilePictureUrl: response.data.picture || null,
                email: response.data.email || null,
                locale: response.data.locale || null,
                name: response.data.name || null
            };
        } catch (error) {
            console.error('Error getting user info with OpenID Connect:', error);
            throw error;
        }
    }

    /**
     * Get user profile information from LinkedIn
     * Uses OpenID Connect userinfo endpoint if OpenID scope is detected
     * Falls back to /v2/me endpoint with r_liteprofile scope otherwise
     */
    public getUserInfo = async (
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Enhanced scope detection for OpenID Connect (same logic as getUserId)
            console.log('🔍 getUserInfo - Token scope analysis:', {
                scope: linkedinTokens.scope,
                scopeType: typeof linkedinTokens.scope
            });

            const scopeString = Array.isArray(linkedinTokens.scope)
                ? linkedinTokens.scope.join(' ')
                : (linkedinTokens.scope || '');

            const isOpenIDConnect = scopeString.includes('openid') || scopeString.includes('profile');
            let userData;

            if (isOpenIDConnect) {
                console.log('✅ Using OpenID Connect userinfo endpoint for profile information');
                userData = await this.getUserInfoWithOpenID(linkedinTokens.access_token);
            } else {
                console.log('⚠️ Using traditional LinkedIn /v2/me endpoint for profile information');
                // Verify scope information if available
                if (linkedinTokens.scope && !scopeString.includes('r_liteprofile')) {
                    console.warn('Warning: r_liteprofile scope not granted. Profile API calls may fail.');
                }

                // Use correct projection syntax as per LinkedIn API documentation
                const response = await axios.get(
                    `https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))`,
                    {
                        headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                    }
                );

                const rawData = response.data;

                // Access localized name using the correct path
                userData = {
                    id: rawData.id,
                    firstName: rawData.firstName?.localized?.['en_US'] || '',
                    lastName: rawData.lastName?.localized?.['en_US'] || '',
                    profilePictureUrl: null
                };

                if (rawData.profilePicture &&
                    rawData.profilePicture['displayImage~'] &&
                    rawData.profilePicture['displayImage~'].elements &&
                    rawData.profilePicture['displayImage~'].elements.length > 0) {
                    userData.profilePictureUrl = rawData.profilePicture['displayImage~'].elements[0].identifiers[0].identifier;
                }
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(userData)
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'profile retrieval');
        }
    }

    /**
     * Create a post on LinkedIn using the shares API
     * Requires w_member_social scope
     */
    public createPost = async (
        { content }: { content: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Get user ID with minimal projection
            const userId = await this.getUserId(linkedinTokens);

            // Using LinkedIn Share API v2 with corrected request structure
            // Required fields only, removed unsupported fields
            const postData = {
                owner: `urn:li:person:${userId}`,
                text: {
                    text: content
                },
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                }
                // Note: lifecycleState and visibility fields are removed
                // LinkedIn automatically handles publishing with w_member_social scope
            };

            console.log('Creating LinkedIn post with data:', JSON.stringify(postData, null, 2));

            const response = await axios.post(
                'https://api.linkedin.com/v2/shares',
                postData,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            console.log('LinkedIn post created successfully, response:', response.data);

            return {
                content: [
                    {
                        type: "text",
                        text: `Post successfully published to LinkedIn! Post ID: ${response.data.id}`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'post creation');
        }
    }

    /**
     * Create a post with the newer /rest/posts endpoint (versus legacy /shares)
     * Requires w_member_social scope
     */
    public createPostV2 = async (
        { content, visibility = "PUBLIC" }: { content: string, visibility?: "PUBLIC" | "CONNECTIONS" },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Get user ID with minimal projection
            const userId = await this.getUserId(linkedinTokens);

            // Using newer REST Posts API with corrected request structure
            // Removed unsupported fields: lifecycleState and visibility
            const postData = {
                author: `urn:li:person:${userId}`,
                commentary: content,
                distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                }
                // Note: lifecycleState and visibility are removed as they're not supported
                // LinkedIn automatically handles publishing with w_member_social scope
            };

            console.log('Creating LinkedIn post (v2) with data:', JSON.stringify(postData, null, 2));

            const response = await axios.post(
                'https://api.linkedin.com/rest/posts',
                postData,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            console.log('LinkedIn post created successfully with Posts API, response:', response.data);

            return {
                content: [
                    {
                        type: "text",
                        text: `Post successfully published to LinkedIn! Post URN: ${response.data.id || 'Created'}`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'post creation (v2)');
        }
    }

    /**
     * Initialize image upload to LinkedIn
     * Returns upload URL and asset URN for the next step
     * Requires w_member_social scope
     */
    public initImageUpload = async (
        { description = "Image upload" }: { description?: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            const userId = await this.getUserId(linkedinTokens);

            // Updated request format for LinkedIn API 202405
            // Adding registerUploadRequest to follow current API convention
            const initRequest = {
                registerUploadRequest: {
                    owner: `urn:li:person:${userId}`,
                    serviceRelationships: [{
                        relationshipType: "OWNER",
                        identifier: "urn:li:userGeneratedContent"
                    }],
                    recipes: ["urn:li:digitalmediaRecipe:feedshare-image"]
                }
            };

            console.log('Initializing LinkedIn image upload with updated request structure:', JSON.stringify(initRequest, null, 2));

            // Updated endpoint path and action header
            const response = await axios.post(
                'https://api.linkedin.com/rest/images?action=registerUpload',
                initRequest,
                {
                    headers: {
                        ...this.getLinkedInHeaders(linkedinTokens.access_token),
                        'LinkedIn-Action': 'registerUpload'
                    }
                }
            );

            console.log('LinkedIn image upload initialization response:', JSON.stringify(response.data, null, 2));

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            uploadUrl: response.data.value.uploadUrl,
                            imageUrn: response.data.value.image
                        })
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'image upload initialization');
        }
    }

    /**
     * Create a post with an image
     * Requires initializing the image upload first with initImageUpload
     * Requires w_member_social scope
     */
    public createUgcImagePost = async (
        {
            content,
            imageUrn,
            title = "",
            visibility = "PUBLIC"
        }: {
            content: string,
            imageUrn: string,
            title?: string,
            visibility?: "PUBLIC" | "CONNECTIONS"
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            const userId = await this.getUserId(linkedinTokens);
            const visibilityValue = visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC";

            // Properly formatted UGC post with media
            const postData = {
                author: `urn:li:person:${userId}`,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content
                        },
                        shareMediaCategory: "IMAGE",
                        media: [
                            {
                                status: "READY",
                                description: {
                                    text: title || "Shared image"
                                },
                                media: imageUrn,
                                title: {
                                    text: title || "Image"
                                }
                            }
                        ]
                    }
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": visibilityValue
                }
            };

            console.log('Creating LinkedIn UGC image post with data:', JSON.stringify(postData, null, 2));

            // Note: LinkedIn-Version header is not required for ugcPosts endpoint
            const response = await axios.post(
                'https://api.linkedin.com/v2/ugcPosts',
                postData,
                {
                    headers: {
                        'Authorization': `Bearer ${linkedinTokens.access_token}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
                    }
                }
            );

            console.log('LinkedIn UGC image post created successfully, response:', response.data);

            return {
                content: [
                    {
                        type: "text",
                        text: `Image post successfully published to LinkedIn! Post URN: ${response.data.id || 'Created'}`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'UGC image post creation');
        }
    }

    /**
     * Get LinkedIn profile analytics and insights
     * Note: This is a mock implementation as LinkedIn's analytics APIs require special permissions
     */
    public getLinkedInAnalytics = async (linkedinTokens: OAuthTokens): Promise<CallToolResult> => {
        try {
            console.log('📊 Getting LinkedIn analytics...');

            // For now, we'll return mock analytics data
            // In a production environment, you would need:
            // 1. LinkedIn Marketing API access
            // 2. Company page admin permissions
            // 3. Proper analytics API endpoints

            const mockAnalytics = {
                profileViews: Math.floor(Math.random() * 100) + 50,
                searchAppearances: Math.floor(Math.random() * 50) + 20,
                postImpressions: Math.floor(Math.random() * 1000) + 500,
                engagementRate: Math.floor(Math.random() * 20) + 80,
                followerCount: Math.floor(Math.random() * 500) + 200,
                connectionRequests: Math.floor(Math.random() * 10) + 5,
                lastUpdated: new Date().toISOString()
            };

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(mockAnalytics)
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'analytics retrieval');
        }
    }

    /**
     * Helper method to get a consistent set of LinkedIn API headers
     * Ensures all required headers are present and correctly formatted
     */
    private getLinkedInHeaders(accessToken: string) {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'LinkedIn-Version': this.LINKEDIN_API_VERSION, // Required for Share API and most LinkedIn endpoints
            'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
        };
    }

    /**
     * Get user ID with minimal projection to reduce permission requirements
     * Uses OpenID Connect userinfo endpoint if OpenID scope is detected
     */
    private getUserId = async (linkedinTokens: OAuthTokens): Promise<string> => {
        try {
            // Enhanced scope detection for OpenID Connect
            console.log('🔍 getUserId - Token scope analysis:', {
                scope: linkedinTokens.scope,
                scopeType: typeof linkedinTokens.scope,
                hasOpenId: linkedinTokens.scope?.includes('openid'),
                hasProfile: linkedinTokens.scope?.includes('profile'),
                hasEmail: linkedinTokens.scope?.includes('email')
            });

            // Check if we're using OpenID Connect - be more flexible with scope detection
            const scopeString = Array.isArray(linkedinTokens.scope)
                ? linkedinTokens.scope.join(' ')
                : (linkedinTokens.scope || '');

            const isOpenIDConnect = scopeString.includes('openid') || scopeString.includes('profile');

            console.log('🔍 OpenID Connect detection result:', {
                isOpenIDConnect,
                scopeString,
                willUseUserInfo: isOpenIDConnect
            });

            if (isOpenIDConnect) {
                console.log('✅ Using OpenID Connect userinfo endpoint');
                // For OpenID Connect, use the userinfo endpoint
                const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
                    headers: this.getOpenIDHeaders(linkedinTokens.access_token)
                });

                console.log('✅ OpenID userinfo response received:', {
                    hasSub: !!response.data?.sub,
                    hasName: !!response.data?.name,
                    dataKeys: Object.keys(response.data || {})
                });

                if (!response.data || !response.data.sub) {
                    throw new Error('LinkedIn API returned invalid user data (missing ID in userinfo)');
                }

                return response.data.sub; // OpenID Connect uses 'sub' as the user identifier
            } else {
                console.log('⚠️ Using traditional LinkedIn /v2/me endpoint');
                // Check scope for traditional OAuth flow
                if (linkedinTokens.scope && !scopeString.includes('r_liteprofile')) {
                    console.warn('Warning: r_liteprofile scope not granted. Profile API calls may fail.');
                }

                // Only request the specific fields you need with explicit projection
                const response = await axios.get('https://api.linkedin.com/v2/me?projection=(id)', {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                });

                if (!response.data || !response.data.id) {
                    throw new Error('LinkedIn API returned invalid user data (missing ID)');
                }

                return response.data.id;
            }
        } catch (error) {
            // Log the error but rethrow it so the calling method can handle it
            console.error('Error getting user ID:', error);
            throw error;
        }
    }

    /**
     * Centralized handler for LinkedIn API errors
     * Maps specific error codes and messages to user-friendly responses
     */
    private handleLinkedInError(error: any, operation: string): CallToolResult {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const data = error.response?.data;

            console.error(`LinkedIn ${operation} error details:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.config?.headers,
                url: error.config?.url
            });

            if (status === 500) {
                // Check if this might be a character limit issue with the shares endpoint
                const url = error.config?.url || '';
                if (url.includes('/v2/shares')) {
                    // Extract the text content to check length
                    try {
                        const requestBody = JSON.parse(error.config?.data || '{}');
                        const textContent = requestBody.text?.text || '';
                        if (textContent.length > 1300) {
                            return {
                                isError: true,
                                content: [{
                                    type: "text",
                                    text: `LinkedIn API error: Your post exceeds the 1,300 character limit for the /v2/shares endpoint. We've updated our implementation to use the /v2/ugcPosts endpoint which supports up to 3,000 characters. Please try again.`
                                }]
                            };
                        }
                    } catch (e) {
                        console.error('Error parsing request body:', e);
                    }
                }

                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `LinkedIn API reported an internal server error. Please try again later or try using the UGC Posts endpoint which is more reliable.`
                    }]
                };
            }

            if (status === 403) {
                // Parse error message
                const errorMessage = data?.message || '';

                if (errorMessage.includes('Unpermitted fields present in REQUEST_BODY')) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: `LinkedIn API error: Your request contains unsupported fields. We've updated our implementation to remove fields like 'lifecycleState' and 'visibility' which are not permitted in Share API requests. Alternatively, try the UGC Posts endpoint which has a more consistent schema.`
                        }]
                    };
                }

                if (errorMessage.includes('NO_VERSION')) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: `LinkedIn API error: For OpenID Connect, the API version header may be causing issues. We've updated the implementation to use the recommended OpenID Connect endpoints.`
                        }]
                    };
                }

                if (errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('permission')) {
                    // Check if we're trying to access /v2/me with an OpenID token
                    const url = error.config?.url || '';
                    if (url.includes('/v2/me')) {
                        return {
                            isError: true,
                            content: [{
                                type: "text",
                                text: `LinkedIn permission denied for ${operation}. You appear to be using OpenID Connect authentication but trying to access the /v2/me endpoint. We've updated the implementation to use the OpenID Connect userinfo endpoint.`
                            }]
                        };
                    }

                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: `LinkedIn permission denied for ${operation}. Please check that your LinkedIn account has granted the required permissions: For OpenID Connect, use "openid", "profile", and "email" scopes. For posting, ensure "w_member_social" is granted.`
                        }]
                    };
                }
            }

            if (status === 401) {
                // Token expired or invalid
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Your LinkedIn session has expired. Please sign in again to reconnect your account.`
                    }]
                };
            }

            if (status === 429) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `LinkedIn API rate limit exceeded. Please try again later.`
                    }]
                };
            }

            if (status === 400) {
                const errorMessage = data?.message || '';
                if (errorMessage.includes('Invalid URN')) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: `LinkedIn API error: Invalid resource identifier (URN). Please check that the image URN or other identifiers are correctly formatted.`
                        }]
                    };
                }
            }

            // General error with response message
            if (data?.message) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `LinkedIn API error (${status}): ${data.message}`
                    }]
                };
            }
        }

        // Default error
        return {
            isError: true,
            content: [{
                type: "text",
                text: `Error during LinkedIn ${operation}: ${error.message || 'Unknown error'}`
            }]
        };
    }

    // Content moderation and filtering
    private validatePromptContent(prompt: string): { isValid: boolean; reason?: string } {
        // Handle undefined or null prompt
        if (!prompt || typeof prompt !== 'string') {
            return {
                isValid: false,
                reason: "No content provided. Please provide text content for your LinkedIn post."
            };
        }

        const lowerPrompt = prompt.toLowerCase();

        // Inappropriate content patterns
        const inappropriatePatterns = [
            // Discriminatory content
            /\b(hate|discriminat|racist|sexist|homophobic|transphobic)\b/i,
            /\b(inferior|superior)\s+(race|gender|religion|ethnicity)/i,

            // Political content
            /\b(vote for|support|oppose|against)\s+[a-z]+\s+(party|candidate|politician)/i,
            /\b(democrat|republican|liberal|conservative)\s+(are|is)\s+(bad|wrong|evil)/i,

            // Personal/private information
            /\b(my salary|my income|company secrets|internal issues|confidential)/i,
            /\b(my boss is|my manager is|my company is)\s+(bad|terrible|awful)/i,

            // False claims
            /\b(fake|false|made up|fabricated)\s+(statistics|data|credentials)/i,
            /\b(claim|say|pretend)\s+i\s+(have|am|own)\s+[^.]*\s+(degree|certification|experience)\s+i\s+don't/i,

            // Overly personal content
            /\b(my depression|my anxiety|my mental health|my therapy|my medication)/i,
            /\b(my divorce|my breakup|my relationship problems|my financial problems)/i,
            /\b(my debt|my bankruptcy|my addiction|my substance)/i,

            // Spam/MLM content
            /\b(mlm|multi.?level marketing|pyramid scheme|get rich quick)/i,
            /\b(dm me|message me|contact me)\s+for\s+(money|cash|opportunity)/i,
            /\b(make money|earn cash|financial freedom)\s+(from home|quickly|easily)/i,

            // Inappropriate requests
            /\b(nude|sexual|explicit|inappropriate|nsfw)/i,
            /\b(hack|illegal|unethical|scam|fraud)/i,
        ];

        // Check for inappropriate patterns
        for (const pattern of inappropriatePatterns) {
            if (pattern.test(prompt)) {
                return {
                    isValid: false,
                    reason: "Content contains inappropriate or unprofessional elements that are not suitable for LinkedIn"
                };
            }
        }

        // Check for excessive self-promotion
        const promotionKeywords = ['buy', 'purchase', 'sale', 'discount', 'offer', 'deal', 'price'];
        const promotionCount = promotionKeywords.filter(keyword => lowerPrompt.includes(keyword)).length;
        if (promotionCount >= 3) {
            return {
                isValid: false,
                reason: "Content appears to be overly promotional. LinkedIn posts should focus on value and insights rather than direct sales"
            };
        }

        // Check for excessive personal details
        const personalKeywords = ['my personal', 'my private', 'my secret', 'confidential', 'don\'t tell'];
        if (personalKeywords.some(keyword => lowerPrompt.includes(keyword))) {
            return {
                isValid: false,
                reason: "Content contains personal information that may not be appropriate for professional networking"
            };
        }

        return { isValid: true };
    }

    // Enhanced story template system for different post types
    private getStoryTemplate(storyType: string, userName: string, userPrompt: string): string {
        const templates = {
            'journey': `
You are writing a compelling LinkedIn journey story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a personal/professional journey story: ${userPrompt}

Write for ${userName} using this JOURNEY STORY structure:

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

            'technical': `
You are writing a technical showcase story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a technical achievement story: ${userPrompt}

Write for ${userName} using this TECHNICAL STORY structure:

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

            'achievement': `
You are writing an achievement celebration story directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into an achievement story: ${userPrompt}

Write for ${userName} using this ACHIEVEMENT STORY structure:

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

            'learning': `
You are writing an educational story with personal experience directly. Do not include any introductory text, explanations, or meta-commentary.

Transform this into a learning/educational story: ${userPrompt}

Write for ${userName} using this LEARNING STORY structure:

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

Start immediately with the learning or insight.`
        };

        return templates[storyType as keyof typeof templates] || templates.journey;
    }

    // Note: intelligentContentWithLinks method moved to index.ts for direct handling

    // Intelligent content generation using AI Orchestration (NEW - Cursor AI-like system)
    public generateIntelligentContent = async (
        { prompt, userContext }: {
            prompt: string,
            userContext?: {
                name?: string;
                role?: string;
                industry?: string;
                previousPosts?: string[];
            }
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(prompt);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            // Get user information for context
            const userInfo = await this.getUserInfo(linkedinTokens);
            const userData = JSON.parse(userInfo.content[0].text);

            // Enhanced user context
            const enhancedContext = {
                name: userData.firstName || userContext?.name || 'User',
                role: userContext?.role,
                industry: userContext?.industry,
                previousPosts: userContext?.previousPosts || []
            };

            console.log("🧠 Using AI Orchestration for intelligent content generation...");

            // Use AI Orchestrator for intelligent processing
            const orchestrationResult = await this.aiOrchestrator.processContent(prompt, enhancedContext);

            console.log("✅ AI Orchestration completed:", {
                storyType: orchestrationResult.classification.storyType,
                confidence: orchestrationResult.confidence,
                modelUsed: orchestrationResult.metadata.modelUsed,
                processingTime: orchestrationResult.metadata.processingTime,
                optimizations: orchestrationResult.metadata.optimizations
            });

            // Return the intelligently generated content with metadata
            return {
                content: [{
                    type: "text",
                    text: orchestrationResult.generatedContent
                }],
                isError: false
            };

        } catch (error: any) {
            console.error('AI Orchestration error:', error);

            // Fallback to traditional generation
            console.log("🔄 Falling back to traditional content generation...");
            return this.generateTextContent({ prompt, storyType: 'journey' }, linkedinTokens);
        }
    }

    // Generate enhanced LinkedIn post content from text using Gemini 2.0 Flash
    public generateTextContent = async (
        { prompt, storyType = 'journey' }: { prompt: string, storyType?: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(prompt);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            // Get user information to personalize the context
            const userInfoResult = await this.getUserInfo(linkedinTokens);
            let enhancedContext = {
                name: 'professional'
            };

            if (!userInfoResult.isError) {
                try {
                    const userInfo = JSON.parse(userInfoResult.content[0].text);
                    enhancedContext.name = `${userInfo.firstName} ${userInfo.lastName}`;
                } catch (e) {
                    console.log("Error parsing user info, using default context");
                }
            }

            console.log("🧠 Using AI Orchestration for intelligent text content generation...");

            // Use AI Orchestrator for intelligent text processing
            const orchestrationResult = await this.aiOrchestrator.processContent(
                prompt,
                enhancedContext
            );

            console.log("✅ AI Orchestration completed for text content:", {
                storyType: orchestrationResult.classification.storyType,
                confidence: orchestrationResult.confidence,
                modelUsed: orchestrationResult.metadata.modelUsed,
                processingTime: orchestrationResult.metadata.processingTime,
                optimizations: orchestrationResult.metadata.optimizations
            });

            const generatedContent = orchestrationResult.generatedContent;

            return {
                content: [
                    {
                        type: "text",
                        text: generatedContent,
                    }
                ]
            };
        } catch (e: any) {
            console.error('Text content generation error:', e.response?.data || e.message);

            // Detailed error handling for different scenarios
            let errorMessage = "Unknown error occurred";

            if (e.response?.data?.error) {
                // Specific Gemini API error
                errorMessage = `Gemini API error: ${e.response.data.error.message}`;
                console.error('Gemini API error details:', e.response.data.error);
            } else if (e.message.includes("GEMINI_API_KEY")) {
                errorMessage = "The server is not configured with a Gemini API key. Please contact the administrator.";
            } else if (e.code === 'ECONNABORTED') {
                errorMessage = "The request to Gemini API timed out. Please try again.";
            } else if (e.message) {
                errorMessage = e.message;
            }

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error generating content: ${errorMessage}`
                }]
            };
        }
    }

    // Analyze image and create LinkedIn post content using Gemma-3-27b-it for image analysis
    public analyzeImageAndCreateContent = async (
        { imageBase64, prompt, mimeType }: { imageBase64: string, prompt: string, mimeType: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(prompt);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            // Validate image data
            if (!imageBase64 || imageBase64.length < 100) {
                throw new Error("Invalid image data provided");
            }

            // Get user information to personalize the context
            const imageUserInfoResult = await this.getUserInfo(linkedinTokens);
            let enhancedContext = {
                name: 'professional'
            };

            if (!imageUserInfoResult.isError) {
                try {
                    const userInfo = JSON.parse(imageUserInfoResult.content[0].text);
                    enhancedContext.name = `${userInfo.firstName} ${userInfo.lastName}`;
                } catch (e) {
                    console.log("Error parsing user info, using default context");
                }
            }

            // Format the image data properly - ensure it doesn't include the data:image prefix
            const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

            console.log("🧠 Using AI Orchestration for intelligent image content generation...");

            // Use AI Orchestrator for intelligent image processing
            const orchestrationResult = await this.aiOrchestrator.processImageContent(
                prompt,
                { mimeType, data: cleanedImageData },
                enhancedContext
            );

            console.log("✅ AI Orchestration completed for image content:", {
                storyType: orchestrationResult.classification.storyType,
                confidence: orchestrationResult.confidence,
                modelUsed: orchestrationResult.metadata.modelUsed,
                processingTime: orchestrationResult.metadata.processingTime,
                optimizations: orchestrationResult.metadata.optimizations
            });

            const generatedContent = orchestrationResult.generatedContent;

            return {
                content: [
                    {
                        type: "text",
                        text: generatedContent,
                    }
                ]
            };
        } catch (e: any) {
            console.error('Image analysis error:', e.response?.data || e.message);

            // Detailed error handling for different scenarios
            let errorMessage = "Unknown error occurred";

            if (e.response?.data?.error) {
                // Specific API error
                errorMessage = `API error: ${e.response.data.error.message}`;
                console.error('API error details:', e.response.data.error);
            } else if (e.message === "Invalid image data provided") {
                errorMessage = "The image data provided is invalid or too small. Please try a different image.";
            } else if (e.message.includes("GEMINI_API_KEY")) {
                errorMessage = "The server is not configured with a Gemini API key. Please contact the administrator.";
            } else if (e.code === 'ECONNABORTED') {
                errorMessage = "The request to API timed out. The image might be too large or complex.";
            } else if (e.message) {
                errorMessage = e.message;
            }

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error analyzing image: ${errorMessage}`
                }]
            };
        }
    }

    /**
     * Create a post using LinkedIn's modern UGC Posts endpoint
     * This endpoint supports longer text (up to 3000 characters) and is the recommended way to create posts
     * Requires w_member_social scope
     */
    public createUgcPost = async (
        { content, visibility = "PUBLIC" }: { content: string, visibility?: "PUBLIC" | "CONNECTIONS" },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(content);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            // Get user ID with minimal projection
            const userId = await this.getUserId(linkedinTokens);

            // Using the recommended UGC Posts endpoint with the correct structure
            const visibilityValue = visibility === "CONNECTIONS" ? "CONNECTIONS" : "PUBLIC";

            const postData = {
                author: `urn:li:person:${userId}`,
                lifecycleState: "PUBLISHED",
                specificContent: {
                    "com.linkedin.ugc.ShareContent": {
                        shareCommentary: {
                            text: content
                        },
                        shareMediaCategory: "NONE"
                    }
                },
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility": visibilityValue
                }
            };

            console.log('Creating LinkedIn UGC post with data:', JSON.stringify(postData, null, 2));

            // Note: LinkedIn-Version header is not required for ugcPosts endpoint
            const response = await axios.post(
                'https://api.linkedin.com/v2/ugcPosts',
                postData,
                {
                    headers: {
                        'Authorization': `Bearer ${linkedinTokens.access_token}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
                    }
                }
            );

            console.log('LinkedIn UGC post created successfully, response:', response.data);

            return {
                content: [
                    {
                        type: "text",
                        text: `Post successfully published to LinkedIn! Post URN: ${response.data.id || 'Created'}`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'UGC post creation');
        }
    }

    // New method to analyze image, create structured content, and post with the image
    public analyzeImageStructuredPostWithImage = async (
        {
            imageBase64,
            userText,
            mimeType
        }: {
            imageBase64: string,
            userText: string,
            mimeType: string
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(userText);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            console.log("Starting combined image analysis and posting process (updated flow)...");

            // Clean image data for Gemini and calculate size (as in original)
            const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageSizeKB = Math.round((cleanedImageData.length * 3) / 4 / 1024);
            console.log(`Image size approximately: ${imageSizeKB}KB`);

            let postContent = "";

            // Step 1: Generate the content using Gemini API
            // This block is preserved from the original method to generate 'postContent'
            try {
                // If image is very large, use user text directly
                if (imageSizeKB > 5000) {
                    console.log("Image is very large (>5MB). Skipping analysis and using user text directly.");
                    postContent = userText;
                } else {
                    console.log("Attempting to analyze image with extended timeout for content generation...");
                    // Use a simpler prompt for large images
                    const simplePrompt = imageSizeKB > 2000 ?
                        "Describe the main elements of this image briefly." :
                        `Analyze this image in detail. Extract key information about:
                        1. What's in the image (objects, people, scene, setting)
                        2. Key themes or messages conveyed
                        3. Professional context (business, tech, marketing, etc.)`;

                    // Use higher timeout for image analysis (60 seconds)
                    const imageAnalysisResponse = await axios.post(
                        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                        {
                            contents: [
                                {
                                    parts: [
                                        { text: simplePrompt },
                                        {
                                            inline_data: {
                                                mime_type: mimeType,
                                                data: cleanedImageData // Use cleaned image data
                                            }
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 500,
                                topP: 0.9
                            }
                        },
                        {
                            params: { key: process.env.GEMINI_API_KEY },
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000 // 60 second timeout for image processing
                        }
                    );

                    // Extract analysis and create content
                    if (imageAnalysisResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const imageAnalysisContext = imageAnalysisResponse.data.candidates[0].content.parts[0].text;
                        console.log("Image analysis succeeded. Creating structured content...");

                        const contentPrompt = `
You are writing a LinkedIn post directly. Do not include any introductory text, explanations, or meta-commentary.

Create a natural LinkedIn post that incorporates this user's draft text and information from the image analysis.

User's draft text:
${userText}

Image analysis:
${imageAnalysisContext}

Write using these guidelines:

CONTENT REQUIREMENTS:
- Professional yet conversational tone that sounds natural on LinkedIn
- 800-1200 characters for optimal engagement
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

IMPORTANT: Start your response immediately with the first word of the LinkedIn post content. No preamble, no explanation, just the post itself.
`;

                        const contentResponse = await axios.post(
                            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                            {
                                contents: [{ parts: [{ text: contentPrompt }] }],
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: 800,
                                    topP: 0.9
                                }
                            },
                            {
                                params: { key: process.env.GEMINI_API_KEY },
                                headers: { 'Content-Type': 'application/json' },
                                timeout: 20000 // 20 second timeout for content generation
                            }
                        );

                        if (contentResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            postContent = contentResponse.data.candidates[0].content.parts[0].text;
                            console.log("Generated structured content successfully");
                        } else {
                            console.log("Content generation failed, using user text as fallback");
                            postContent = userText;
                        }
                    } else {
                        console.log("Image analysis failed, using user text as fallback");
                        postContent = userText;
                    }
                }
            } catch (analysisError: any) {
                console.error("Error during image analysis or content generation:", analysisError.message);
                if (axios.isAxiosError(analysisError) && analysisError.response?.data?.error?.message) {
                    // Log specific Gemini API error
                    console.error("Gemini API error details:", analysisError.response.data.error);
                }
                console.log("Using user text as fallback due to analysis error");
                postContent = userText; // Fallback to userText if Gemini analysis fails
            }

            if (!postContent || postContent.trim() === "") {
                postContent = userText || "Check out this image I'm sharing on LinkedIn!"; // Ensure there's always some content
            }
            console.log("Final post content for LinkedIn:", postContent);

            // Step 2: Post the image and generated content using the robust linkedInPostWithImage method
            console.log("Calling linkedInPostWithImage to publish the post...");
            return await this.linkedInPostWithImage(
                {
                    imageBase64, // Pass original base64 for linkedInPostWithImage
                    text: postContent,
                    mimeType
                },
                linkedinTokens
            );

        } catch (e: any) {
            // This top-level catch handles errors from initial setup or if linkedInPostWithImage throws an unexpected error
            // (though it's designed to return CallToolResult for known errors).
            // Errors from Gemini should be caught by its specific try-catch block above.
            console.error('Unhandled error in analyzeImageStructuredPostWithImage:', e);

            let errorMessage = "An unexpected error occurred during the image analysis and posting process.";
            if (e.message) {
                errorMessage = e.message;
            }
            // Check if it's a Gemini API error not caught by the inner try-catch (should be rare)
            if (axios.isAxiosError(e) && e.response?.data?.error?.message) {
                errorMessage = `Gemini API error: ${e.response.data.error.message}`;
            }
            // If the error is a CallToolResult from a nested call that was re-thrown (should be rare)
            else if (e.isError && e.content && Array.isArray(e.content) && e.content[0]?.text) {
                errorMessage = e.content[0].text;
            }

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error: ${errorMessage}`
                }]
            };
        }
    }

    // New method to analyze image and create structured content based on user text
    public analyzeImageCreateStructuredPost = async (
        {
            imageBase64,
            userText,
            mimeType
        }: {
            imageBase64: string,
            userText: string,
            mimeType: string
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            console.log("Starting image analysis for structured post creation...");

            // Calculate image size
            const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageSizeKB = Math.round((cleanedImageData.length * 3) / 4 / 1024);
            console.log(`Image size approximately: ${imageSizeKB}KB`);

            let structuredContent = "";

            // Generate content based on image analysis and user text
            try {
                // If image is very large, use user text directly
                if (imageSizeKB > 5000) {
                    console.log("Image is very large (>5MB). Skipping analysis and using user text directly.");
                    structuredContent = userText;
                } else {
                    console.log("Attempting to analyze image with extended timeout...");
                    // Use a simpler prompt for large images
                    const simplePrompt = imageSizeKB > 2000 ?
                        "Describe the main elements of this image briefly." :
                        `Analyze this image in detail. Extract key information about:
                        1. What's in the image (objects, people, scene, setting)
                        2. Key themes or messages conveyed
                        3. Professional context (business, tech, marketing, etc.)`;

                    // Use higher timeout for image analysis (60 seconds)
                    const imageAnalysisResponse = await axios.post(
                        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                        {
                            contents: [
                                {
                                    parts: [
                                        { text: simplePrompt },
                                        {
                                            inline_data: {
                                                mime_type: mimeType,
                                                data: cleanedImageData
                                            }
                                        }
                                    ]
                                }
                            ],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 500,
                                topP: 0.9
                            }
                        },
                        {
                            params: { key: process.env.GEMINI_API_KEY },
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 60000 // 60 second timeout for image processing
                        }
                    );

                    // Extract analysis and create content
                    if (imageAnalysisResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        const imageAnalysisContext = imageAnalysisResponse.data.candidates[0].content.parts[0].text;
                        console.log("Image analysis succeeded. Creating structured content...");

                        // Enhanced professional prompt for content generation
                        const contentPrompt = `
You are writing a LinkedIn post directly. Do not include any introductory text, explanations, or meta-commentary.

Create a natural LinkedIn post that incorporates this user's draft text and information from the image analysis.

User's draft text:
${userText}

Image analysis:
${imageAnalysisContext}

Write using these guidelines:

CONTENT REQUIREMENTS:
- Professional yet conversational tone that sounds natural on LinkedIn
- 800-1200 characters for optimal engagement
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

IMPORTANT: Start your response immediately with the first word of the LinkedIn post content. No preamble, no explanation, just the post itself.
`;

                        const contentResponse = await axios.post(
                            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
                            {
                                contents: [{ parts: [{ text: contentPrompt }] }],
                                generationConfig: {
                                    temperature: 0.7,
                                    maxOutputTokens: 800,
                                    topP: 0.9
                                }
                            },
                            {
                                params: { key: process.env.GEMINI_API_KEY },
                                headers: { 'Content-Type': 'application/json' },
                                timeout: 20000
                            }
                        );

                        if (contentResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            structuredContent = contentResponse.data.candidates[0].content.parts[0].text;
                            console.log("Generated structured content successfully");
                        } else {
                            console.log("Content generation failed, using user text as fallback");
                            structuredContent = userText;
                        }
                    } else {
                        console.log("Image analysis failed, using user text as fallback");
                        structuredContent = userText;
                    }
                }
            } catch (analysisError: any) {
                console.error("Error during image analysis or content generation:", analysisError.message);
                console.log("Using user text as fallback due to analysis error");
                structuredContent = userText;
            }

            if (!structuredContent || structuredContent.trim() === "") {
                structuredContent = userText || "Check out this content I'm sharing on LinkedIn!";
            }

            console.log("Structured content generation complete");

            return {
                content: [{
                    type: "text",
                    text: structuredContent
                }]
            };
        } catch (e: any) {
            console.error('Error in image analysis and structured content creation:', e);

            let errorMessage = "Unknown error occurred";
            if (e.response?.data?.error) {
                errorMessage = `API error: ${e.response.data.error.message}`;
            } else if (e.message) {
                errorMessage = e.message;
            }

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error creating structured content: ${errorMessage}`
                }]
            };
        }
    }

    /**
     * A simplified, reliable implementation for posting LinkedIn images with text
     * Based on LinkedIn's official API guidelines - ensures consistent v2 API usage
     * Implements synchronous upload as recommended by LinkedIn documentation
     */
    public linkedInPostWithImage = async (
        {
            imageBase64,
            text,
            mimeType = "image/jpeg"
        }: {
            imageBase64: string,
            text: string,
            mimeType?: string
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            Logger.info("=== LINKEDIN IMAGE POST START ===");
            Logger.info("Starting LinkedIn image post with synchronous upload approach...");

            // Step 1: Get user ID/URN
            const userId = await this.getUserId(linkedinTokens);
            const userUrn = `urn:li:person:${userId}`;
            Logger.info(`Using user URN: ${userUrn}`);

            // Step 2: Clean image data
            const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            const buffer = Buffer.from(cleanedImageData, 'base64');
            Logger.info(`Image data prepared: ${buffer.length} bytes`);

            // Step 3: Register image upload with SYNCHRONOUS_UPLOAD option
            Logger.info("Registering image upload with SYNCHRONOUS_UPLOAD...");
            const registerPayload = {
                initializeUploadRequest: {
                    owner: userUrn,
                    // supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"] // Removed unsupported field
                }
            };

            Logger.debug("Image upload registration payload:", registerPayload);

            try {
                const registerResponse = await axios.post(
                    'https://api.linkedin.com/rest/images?action=initializeUpload',
                    registerPayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${linkedinTokens.access_token}`,
                            'Content-Type': 'application/json',
                            'X-Restli-Protocol-Version': '2.0.0',
                            'LinkedIn-Version': this.LINKEDIN_API_VERSION
                        }
                    }
                );

                Logger.info("Image registration successful, status:", registerResponse.status);
                Logger.debug("Register response data:", registerResponse.data);

                if (!registerResponse.data?.value?.uploadUrl || !registerResponse.data?.value?.image) {
                    throw new Error("Invalid response from image registration: missing uploadUrl or image URN");
                }

                const uploadUrl = registerResponse.data.value.uploadUrl;
                const imageUrn = registerResponse.data.value.image;

                Logger.info(`Image registered. Image URN: ${imageUrn}`);
                Logger.debug(`Upload URL: ${uploadUrl}`);

                // Step 4: Upload the image - with synchronous upload, this should ensure processing completes
                Logger.info("Uploading image with synchronous processing...");

                try {
                    const uploadResponse = await axios.put(
                        uploadUrl,
                        buffer,
                        {
                            headers: {
                                'Authorization': `Bearer ${linkedinTokens.access_token}`,
                                'Content-Type': mimeType
                            },
                            timeout: 60000 // 60 seconds - increased for synchronous processing
                        }
                    );

                    Logger.info(`Image upload status: ${uploadResponse.status}`);
                    Logger.debug("Upload response headers:", uploadResponse.headers);

                    // Step 5: Verify the image is available before proceeding
                    Logger.info("Verifying image processing status...");
                    const imageId = imageUrn.split(':').pop();

                    // Poll for image status to ensure it's ready
                    let isAvailable = false;
                    let attempts = 0;
                    const maxAttempts = 5;

                    while (!isAvailable && attempts < maxAttempts) {
                        try {
                            Logger.info(`Checking image status (attempt ${attempts + 1}/${maxAttempts})...`);
                            const statusResponse = await axios.get(
                                `https://api.linkedin.com/rest/images/${imageId}`,
                                {
                                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                                }
                            );

                            Logger.info(`Image status: ${statusResponse.data.status}`);
                            Logger.debug("Full status response:", statusResponse.data);

                            if (statusResponse.data.status === "AVAILABLE") {
                                isAvailable = true;
                                Logger.info("Image is available for use in posts.");
                            } else {
                                Logger.info(`Image not yet available, waiting...`);
                                // Wait between polling attempts
                                await new Promise(resolve => setTimeout(resolve, 3000));
                            }
                        } catch (error) {
                            Logger.error(`Error checking image status:`, error);
                            // Log detailed error information
                            if (axios.isAxiosError(error) && error.response) {
                                Logger.error("Status check response error:", {
                                    status: error.response.status,
                                    data: error.response.data,
                                    headers: error.response.headers
                                });
                            }
                            // Continue with next attempt
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        }

                        attempts++;
                    }

                    if (!isAvailable) {
                        Logger.warn("Image processing timed out, attempting post creation anyway...");
                    }

                    // Step 6: Create post with the image using the REST API
                    Logger.info("Creating post with image using REST API...");
                    const postData = {
                        author: userUrn,
                        commentary: text,
                        visibility: "PUBLIC",
                        distribution: {
                            feedDistribution: "MAIN_FEED",
                            targetEntities: [],
                            thirdPartyDistributionChannels: []
                        },
                        content: {
                            media: {
                                altText: "Image shared via POST.AI",
                                id: imageUrn
                            }
                        },
                        lifecycleState: "PUBLISHED",
                        isReshareDisabledByAuthor: false
                    };

                    Logger.debug("Post creation payload:", postData);

                    try {
                        const postResponse = await axios.post(
                            'https://api.linkedin.com/rest/posts',
                            postData,
                            {
                                headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                            }
                        );

                        Logger.info("Post with image created successfully!");
                        Logger.info("Post creation response status:", postResponse.status);
                        Logger.debug("Post creation response headers:", postResponse.headers);
                        Logger.info("=== LINKEDIN IMAGE POST SUCCESS ===");

                        return {
                            content: [{
                                type: "text",
                                text: `Post with image published to LinkedIn! Post ID: ${postResponse.headers['x-linkedin-id'] || 'Created'}`
                            }]
                        };
                    } catch (postError) {
                        Logger.error("Error creating LinkedIn post:", postError);

                        if (axios.isAxiosError(postError) && postError.response) {
                            Logger.error("Post creation response error:", {
                                status: postError.response.status,
                                statusText: postError.response.statusText,
                                data: postError.response.data,
                                headers: postError.response.headers
                            });

                            // Check for ownership error
                            if (postError.response.data?.message?.includes("content ownership") ||
                                postError.response.data?.errorDetails?.inputErrors?.some(
                                    (e: any) => e.code === "INVALID_CONTENT_OWNERSHIP"
                                )) {
                                Logger.error("CONTENT OWNERSHIP ERROR DETECTED. Full error:", postError.response.data);
                            }
                        }

                        throw postError; // Re-throw to be caught by outer catch
                    }
                } catch (uploadError) {
                    Logger.error("Error uploading image to LinkedIn:", uploadError);
                    if (axios.isAxiosError(uploadError) && uploadError.response) {
                        Logger.error("Upload response error:", {
                            status: uploadError.response.status,
                            statusText: uploadError.response.statusText,
                            data: uploadError.response.data,
                            headers: uploadError.response.headers
                        });
                    }
                    throw uploadError; // Re-throw to be caught by outer catch
                }
            } catch (registerError) {
                Logger.error("Error registering image with LinkedIn:", registerError);
                if (axios.isAxiosError(registerError) && registerError.response) {
                    Logger.error("Registration response error:", {
                        status: registerError.response.status,
                        statusText: registerError.response.statusText,
                        data: registerError.response.data,
                        headers: registerError.response.headers
                    });
                }
                throw registerError; // Re-throw to be caught by outer catch
            }
        } catch (error: any) {
            Logger.error("Error in LinkedIn image posting:", error);
            Logger.info("=== LINKEDIN IMAGE POST FAILED ===");

            // Handle specific error cases
            if (error.response?.status === 401) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "LinkedIn authentication failed. Please reconnect your LinkedIn account."
                    }]
                };
            }

            // Check for content ownership issues
            if (error.response?.data?.message?.includes("ownership") ||
                error.response?.data?.message?.includes("CONTENT_NOT_FOUND") ||
                error.response?.data?.errorDetails?.inputErrors?.some(
                    (e: any) => e.code === "INVALID_CONTENT_OWNERSHIP"
                )) {

                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "LinkedIn content ownership error: The image was uploaded but LinkedIn couldn't verify ownership. This issue often occurs with LinkedIn's API. Please try using the text-only post feature instead."
                    }]
                };
            }

            // Generic error handling
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `LinkedIn image posting error: ${error.message || 'Unknown error'} ${error.response?.data?.message || ''}`
                }]
            };
        }
    }

    /**
     * Posts multiple images with text to LinkedIn using the Posts API
     * Requires w_member_social scope
     */
    public linkedInPostWithMultipleImages = async (
        {
            imageBase64s,
            text,
            mimeType = "image/jpeg"
        }: {
            imageBase64s: string[],
            text: string,
            mimeType?: string
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Validate prompt content first
            const validation = this.validatePromptContent(text);
            if (!validation.isValid) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: `Content validation failed: ${validation.reason}\n\nPlease provide professional, appropriate content suitable for LinkedIn networking.`
                    }]
                };
            }

            Logger.info("=== LINKEDIN MULTI-IMAGE POST START ===");
            Logger.info("Starting LinkedIn multi-image post...");

            // Validate input
            if (imageBase64s.length < 2 || imageBase64s.length > 20) {
                throw new Error("Multi-image posts require 2 to 20 images.");
            }

            // Step 1: Get user ID/URN
            const userId = await this.getUserId(linkedinTokens);
            const userUrn = `urn:li:person:${userId}`;
            Logger.info(`Using user URN: ${userUrn}`);

            // Step 2: Upload each image and collect their URNs
            const imageUrns: string[] = [];
            for (let i = 0; i < imageBase64s.length; i++) {
                const imageBase64 = imageBase64s[i];
                Logger.info(`Processing image ${i + 1} of ${imageBase64s.length}...`);

                // Clean image data
                const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
                const buffer = Buffer.from(cleanedImageData, 'base64');
                Logger.info(`Image ${i + 1} data prepared: ${buffer.length} bytes`);

                // Initialize upload
                Logger.info(`Registering image ${i + 1} upload...`);
                const registerPayload = {
                    initializeUploadRequest: {
                        owner: userUrn
                    }
                };
                Logger.debug(`Image ${i + 1} upload registration payload:`, registerPayload);

                const registerResponse = await axios.post(
                    'https://api.linkedin.com/rest/images?action=initializeUpload',
                    registerPayload,
                    {
                        headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                    }
                );

                Logger.info(`Image ${i + 1} registration successful, status: ${registerResponse.status}`);
                Logger.debug(`Image ${i + 1} register response data:`, registerResponse.data);

                if (!registerResponse.data?.value?.uploadUrl || !registerResponse.data?.value?.image) {
                    throw new Error(`Invalid response from image ${i + 1} registration: missing uploadUrl or image URN`);
                }

                const uploadUrl = registerResponse.data.value.uploadUrl;
                const imageUrn = registerResponse.data.value.image;
                Logger.info(`Image ${i + 1} registered. Image URN: ${imageUrn}`);
                Logger.debug(`Image ${i + 1} upload URL: ${uploadUrl}`);

                // Upload image
                Logger.info(`Uploading image ${i + 1}...`);
                const uploadResponse = await axios.put(
                    uploadUrl,
                    buffer,
                    {
                        headers: {
                            'Authorization': `Bearer ${linkedinTokens.access_token}`,
                            'Content-Type': mimeType
                        },
                        timeout: 60000 // 60 seconds
                    }
                );

                Logger.info(`Image ${i + 1} upload status: ${uploadResponse.status}`);
                Logger.debug(`Image ${i + 1} upload response headers:`, uploadResponse.headers);

                // Verify image availability
                Logger.info(`Verifying image ${i + 1} processing status...`);
                let isAvailable = false;
                let attempts = 0;
                const maxAttempts = 20;
                const delay = 5000; // 5 seconds

                while (!isAvailable && attempts < maxAttempts) {
                    Logger.info(`Checking image ${i + 1} status (attempt ${attempts + 1}/${maxAttempts})...`);
                    try {
                        const statusResponse = await axios.get(
                            `https://api.linkedin.com/rest/images/${encodeURIComponent(imageUrn)}`,
                            {
                                headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                            }
                        );

                        Logger.info(`Image ${i + 1} status: ${statusResponse.data.status}`);
                        Logger.debug(`Image ${i + 1} full status response:`, statusResponse.data);

                        if (statusResponse.data.status === "AVAILABLE") {
                            isAvailable = true;
                            Logger.info(`Image ${i + 1} is available for use in posts.`);
                        } else {
                            Logger.info(`Image ${i + 1} not yet available, waiting...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    } catch (error) {
                        Logger.error(`Error checking image ${i + 1} status:`, error);
                        if (axios.isAxiosError(error) && error.response) {
                            Logger.error(`Image ${i + 1} status check response error:`, {
                                status: error.response.status,
                                data: error.response.data,
                                headers: error.response.headers
                            });
                        }
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    attempts++;
                }

                if (!isAvailable) {
                    throw new Error(`Image ${i + 1} did not become available after ${maxAttempts} attempts.`);
                }

                imageUrns.push(imageUrn);
            }

            // Step 3: Create post with multiple images
            Logger.info("Creating post with multiple images using REST API...");
            const postData = {
                author: userUrn,
                commentary: text,
                visibility: "PUBLIC",
                distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                content: {
                    multiImage: {
                        images: imageUrns.map((urn, index) => ({
                            id: urn,
                            altText: `Description for image ${index + 1}`
                        }))
                    }
                },
                lifecycleState: "PUBLISHED",
                isReshareDisabledByAuthor: false
            };

            Logger.debug("Post creation payload:", postData);

            const postResponse = await axios.post(
                'https://api.linkedin.com/rest/posts',
                postData,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            Logger.info("Post with multiple images created successfully!");
            Logger.info(`Post creation response status: ${postResponse.status}`);
            Logger.debug("Post creation response headers:", postResponse.headers);
            Logger.info("=== LINKEDIN MULTI-IMAGE POST SUCCESS ===");

            return {
                content: [{
                    type: "text",
                    text: `Post with multiple images published to LinkedIn! Post ID: ${postResponse.headers['x-linkedin-id'] || 'Created'}`
                }]
            };
        } catch (error: any) {
            Logger.error("Error in LinkedIn multi-image posting:", error);
            Logger.info("=== LINKEDIN MULTI-IMAGE POST FAILED ===");

            if (axios.isAxiosError(error) && error.response) {
                Logger.error("Response error:", {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    headers: error.response.headers
                });

                if (error.response.status === 401) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "LinkedIn authentication failed. Please reconnect your LinkedIn account."
                        }]
                    };
                }

                if (error.response.data?.message?.includes("ownership") ||
                    error.response.data?.errorDetails?.inputErrors?.some(
                        (e: any) => e.code === "INVALID_CONTENT_OWNERSHIP"
                    )) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "LinkedIn content ownership error: One or more images couldn't be verified as owned by the author. Please try again or use text-only posts."
                        }]
                    };
                }

                if (error.response.status === 429) {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "LinkedIn API rate limit exceeded. Please try again later."
                        }]
                    };
                }
            }

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `LinkedIn multi-image posting error: ${error.message || 'Unknown error'} ${error.response?.data?.message || ''}`
                }]
            };
        }
    }

    /**
     * Smart LinkedIn post tool that handles both single and multiple images
     * Provides intelligent content enhancement based on image analysis
     * Uses the appropriate LinkedIn API based on number of images
     * Requires w_member_social scope
     */
    public smartLinkedInPostWithImages = async (
        {
            imageBase64s,
            userText,
            mimeType = "image/jpeg"
        }: {
            imageBase64s: string[], // Array of image base64 strings
            userText: string,       // User's draft text
            mimeType?: string       // Mime type of images
        },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            Logger.info("=== SMART LINKEDIN POST WITH IMAGES START ===");

            // Validate input
            if (!imageBase64s || !Array.isArray(imageBase64s) || imageBase64s.length === 0) {
                throw new Error("At least one image is required");
            }

            if (imageBase64s.length > 20) {
                throw new Error("Maximum 20 images are allowed for LinkedIn posts");
            }

            // Determine if this is a single image or multi-image post
            const isSingleImage = imageBase64s.length === 1;
            Logger.info(`Post type: ${isSingleImage ? 'Single image' : 'Multi-image carousel'} with ${imageBase64s.length} image(s)`);

            // Step 1: Analyze images with Gemini to enhance content
            Logger.info("Starting image analysis with Gemini...");
            let enhancedContent = userText;

            try {
                // For multi-image posts, select two random images for analysis
                // For single image, just use that image
                let imagesToAnalyze: string[] = [];

                if (isSingleImage) {
                    imagesToAnalyze = [imageBase64s[0]];
                    Logger.info("Analyzing the single uploaded image");
                } else {
                    // Select 2 random images for analysis to keep API calls efficient
                    const shuffled = [...imageBase64s].sort(() => 0.5 - Math.random());
                    imagesToAnalyze = shuffled.slice(0, 2);
                    Logger.info(`Selected 2 random images from ${imageBase64s.length} for analysis`);
                }

                // Process each selected image with Gemini
                let imageAnalysisResults = [];

                for (let i = 0; i < imagesToAnalyze.length; i++) {
                    const cleanedImageData = imagesToAnalyze[i].replace(/^data:image\/[a-z]+;base64,/, '');
                    const imageSizeKB = Math.round((cleanedImageData.length * 3) / 4 / 1024);
                    Logger.info(`Analyzing image ${i + 1}: size approximately ${imageSizeKB}KB`);

                    // Skip detailed analysis for very large images
                    if (imageSizeKB > 5000) {
                        Logger.info(`Image ${i + 1} exceeds 5MB, using simple analysis`);
                        continue;
                    }

                    const analysisPrompt = `Analyze this image and describe the key elements, themes, and messages conveyed in 2-3 sentences.`;

                    try {
                        const response = await axios.post(
                            'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                            {
                                contents: [{
                                    parts: [
                                        { text: analysisPrompt },
                                        {
                                            inline_data: {
                                                mime_type: mimeType,
                                                data: cleanedImageData
                                            }
                                        }
                                    ]
                                }],
                                generationConfig: {
                                    temperature: 0.4,
                                    maxOutputTokens: 300,
                                    topP: 0.9
                                }
                            },
                            {
                                params: { key: process.env.GEMINI_API_KEY },
                                headers: { 'Content-Type': 'application/json' },
                                timeout: 30000 // 30 second timeout
                            }
                        );

                        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                            const analysisText = response.data.candidates[0].content.parts[0].text;
                            imageAnalysisResults.push(analysisText);
                            Logger.info(`Image ${i + 1} analysis successful`);
                        }
                    } catch (err) {
                        Logger.error(`Error analyzing image ${i + 1}:`, err);
                    }
                }

                // If we have any successful analysis, enhance the content
                if (imageAnalysisResults.length > 0) {
                    Logger.info("Creating enhanced content with image analysis and trending hashtags...");

                    const contentPrompt = `
Create a professional LinkedIn post that incorporates the user's text and insights from the attached images.

User's text:
${userText}

Image analysis:
${imageAnalysisResults.join('\n\n')}

Guidelines:
1. Create a cohesive narrative that incorporates the user's ideas with visual elements from the images
2. Maintain a professional tone suitable for LinkedIn
3. Add structure with line breaks for readability
4. Include 3-5 trending hashtags related to the content
5. Keep the total length under 1200 characters
6. Ensure the post is engaging and encouraging likes, comments, and shares
7. Do not explicitly reference "the image shows" or similar phrases
8. Focus on the message over describing the visuals

Format the post ready to publish, with hashtags at the end.
                    `;

                    const contentResponse = await axios.post(
                        'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                        {
                            contents: [{ parts: [{ text: contentPrompt }] }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 800,
                                topP: 0.9
                            }
                        },
                        {
                            params: { key: process.env.GEMINI_API_KEY },
                            headers: { 'Content-Type': 'application/json' },
                            timeout: 20000
                        }
                    );

                    if (contentResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
                        enhancedContent = contentResponse.data.candidates[0].content.parts[0].text;
                        Logger.info("Successfully generated enhanced content with hashtags");
                    } else {
                        Logger.info("Using original user text as fallback");
                    }
                } else {
                    Logger.info("No successful image analysis, using original text");
                }
            } catch (analysisError) {
                Logger.error("Error during content enhancement:", analysisError);
                Logger.info("Proceeding with original user text");
            }

            // Step 2: Post to LinkedIn using the appropriate method based on image count
            if (isSingleImage) {
                Logger.info("Proceeding with single image post...");
                return await this.linkedInPostWithImage(
                    {
                        imageBase64: imageBase64s[0],
                        text: enhancedContent,
                        mimeType
                    },
                    linkedinTokens
                );
            } else {
                Logger.info("Proceeding with multi-image carousel post...");
                return await this.linkedInPostWithMultipleImages(
                    {
                        imageBase64s,
                        text: enhancedContent,
                        mimeType
                    },
                    linkedinTokens
                );
            }

        } catch (error: any) {
            Logger.error("Error in smart LinkedIn post with images:", error);
            Logger.info("=== SMART LINKEDIN POST WITH IMAGES FAILED ===");

            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error creating LinkedIn post: ${error.message || 'Unknown error'}`
                }]
            };
        }
    }

    // Other tool methods can be added here as needed
}