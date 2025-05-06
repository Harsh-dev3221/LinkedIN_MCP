import axios from "axios";
import Logger from "../utils/Logger.js";

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
    private readonly LINKEDIN_API_VERSION = '202504'; // Most current version as of May 2025
    private readonly LINKEDIN_PROTOCOL_VERSION = '2.0.0';

    // Define field projections to match permission scopes
    private readonly BASE_FIELDS = '(id,localizedFirstName,localizedLastName)';
    private readonly PROFILE_PIC_FIELDS = 'profilePicture(displayImage~:playableStreams)';
    private readonly EMAIL_FIELDS = 'emailAddress';

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
            // Check if we're using OpenID Connect (scope contains "openid")
            const isOpenIDConnect = linkedinTokens.scope && linkedinTokens.scope.includes('openid');
            let userData;

            if (isOpenIDConnect) {
                console.log('Using OpenID Connect userinfo endpoint for profile information');
                userData = await this.getUserInfoWithOpenID(linkedinTokens.access_token);
            } else {
                // Verify scope information if available
                if (linkedinTokens.scope && !linkedinTokens.scope.includes('r_liteprofile')) {
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
            // Check if we're using OpenID Connect
            const isOpenIDConnect = linkedinTokens.scope && linkedinTokens.scope.includes('openid');

            if (isOpenIDConnect) {
                // For OpenID Connect, use the userinfo endpoint
                const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
                    headers: this.getOpenIDHeaders(linkedinTokens.access_token)
                });

                if (!response.data || !response.data.sub) {
                    throw new Error('LinkedIn API returned invalid user data (missing ID in userinfo)');
                }

                return response.data.sub; // OpenID Connect uses 'sub' as the user identifier
            } else {
                // Check scope for traditional OAuth flow
                if (linkedinTokens.scope && !linkedinTokens.scope.includes('r_liteprofile')) {
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

    // Analyze image and create LinkedIn post content
    public analyzeImageAndCreateContent = async (
        { imageBase64, prompt, mimeType }: { imageBase64: string, prompt: string, mimeType: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Check if GEMINI_API_KEY is configured
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (!geminiApiKey) {
                throw new Error("GEMINI_API_KEY is not configured in the environment");
            }

            // Get user information to personalize the prompt
            const userInfoResult = await this.getUserInfo(linkedinTokens);
            let userName = "professional";

            if (!userInfoResult.isError) {
                try {
                    const userInfo = JSON.parse(userInfoResult.content[0].text);
                    userName = `${userInfo.firstName} ${userInfo.lastName}`;
                } catch (e) {
                    console.log("Error parsing user info, using default prompt");
                }
            }

            // Validate image data
            if (!imageBase64 || imageBase64.length < 100) {
                throw new Error("Invalid image data provided");
            }

            // Updated prompt with enhanced instructions
            const improvedPrompt = `
    Analyze the provided image and the following instructions to create a highly professional LinkedIn post for ${userName}.
    
    Instructions: ${prompt}
    
    Guidelines for the LinkedIn post:
    1. **Tone**: Maintain a very professional tone throughout. Use formal language and avoid any casual or informal expressions.
    2. **Content Integration**: Thoroughly analyze both the image and the instructions to ensure the post is cohesive and directly relevant. The image and text should complement each other seamlessly.
    3. **Conciseness**: Aim for 150-250 words, focusing strictly on the most important points. Exclude any extraneous details that do not directly contribute to the main message.
    4. **Hashtags**: Include 3-5 hashtags that are widely recognized and frequently used in professional LinkedIn discussions related to the topic.
    5. **Call-to-Action**: Incorporate a clear and compelling call-to-action to encourage engagement, such as inviting comments or shares.
    6. **SEO Optimization**: Integrate keywords and phrases that professionals are likely to search for on LinkedIn when looking for content on this topic.
    7. **Formatting**: Use appropriate line breaks and keep paragraphs short for better readability.
    
    Ensure that the generated post adheres strictly to these guidelines and does not include any additional commentary or explanations.
            `;

            console.log("Calling Gemini API for image analysis...");
            console.log("Image type:", mimeType);
            console.log("Image data length:", imageBase64.length);

            // Format the image data properly - ensure it doesn't include the data:image prefix
            const cleanedImageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

            // Call Gemini API for image analysis and content creation
            const response = await axios.post(
                'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
                {
                    contents: [
                        {
                            parts: [
                                { text: improvedPrompt },
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
                        temperature: 0.7,
                        maxOutputTokens: 800,
                        topP: 0.9
                    }
                },
                {
                    params: { key: geminiApiKey },
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000 // 30 second timeout for image processing
                }
            );

            // Validate and extract the response
            if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
                throw new Error("Invalid response from Gemini API: Missing candidates");
            }

            if (!response.data.candidates[0].content || !response.data.candidates[0].content.parts) {
                throw new Error("Invalid response from Gemini API: Missing content");
            }

            const generatedContent = response.data.candidates[0].content.parts[0].text;
            if (!generatedContent) {
                throw new Error("Gemini API returned empty content");
            }

            // Add a note about using UGC Posts for longer content
            const contentLength = generatedContent.length;
            let noteAboutLength = "";

            if (contentLength > 1300) {
                noteAboutLength = "\n\nNote: This generated content is " + contentLength +
                    " characters, which exceeds LinkedIn's 1,300 character limit for the legacy /shares endpoint. " +
                    "Please use the 'Create UGC Post' feature instead, which supports up to 3,000 characters.";
            }

            console.log("Successfully generated content with Gemini API");

            return {
                content: [
                    {
                        type: "text",
                        text: generatedContent + noteAboutLength,
                    }
                ]
            };
        } catch (e: any) {
            console.error('Image analysis error:', e.response?.data || e.message);

            // Detailed error handling for different scenarios
            let errorMessage = "Unknown error occurred";

            if (e.response?.data?.error) {
                // Specific Gemini API error
                errorMessage = `Gemini API error: ${e.response.data.error.message}`;
                console.error('Gemini API error details:', e.response.data.error);
            } else if (e.message === "Invalid image data provided") {
                errorMessage = "The image data provided is invalid or too small. Please try a different image.";
            } else if (e.message.includes("GEMINI_API_KEY")) {
                errorMessage = "The server is not configured with a Gemini API key. Please contact the administrator.";
            } else if (e.code === 'ECONNABORTED') {
                errorMessage = "The request to Gemini API timed out. The image might be too large or complex.";
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
Create a professional LinkedIn post that incorporates this user's draft text and information from the image analysis.
                        
User's draft text:
${userText}

Image analysis:
${imageAnalysisContext}

Guidelines:
- Professional tone suitable for LinkedIn
- Concise and engaging (under 1000 characters)
- Incorporate relevant elements from the image without explicitly describing it
- Preserve the user's key points and intent
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

                        // We'll use a simpler approach for the second API call to avoid more timeouts
                        const contentPrompt = `
Create a professional LinkedIn post that incorporates this user's draft text and information from the image analysis.
                        
User's draft text:
${userText}

Image analysis:
${imageAnalysisContext}

Guidelines:
- Professional tone suitable for LinkedIn
- Concise and engaging (under 1000 characters)
- Incorporate relevant elements from the image without explicitly describing it
- Preserve the user's key points and intent
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