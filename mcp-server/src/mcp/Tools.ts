import axios from "axios";

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
    private readonly LINKEDIN_API_VERSION = '202405'; // Most current version as of May 2024
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
     * Update an existing post
     * Requires w_member_social scope
     */
    public updatePost = async (
        { postUrn, content }: { postUrn: string, content: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            const updateData = {
                commentary: content
            };

            console.log(`Updating LinkedIn post ${postUrn}`);

            const response = await axios.patch(
                `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}`,
                updateData,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            return {
                content: [
                    {
                        type: "text",
                        text: `Post updated successfully!`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'post update');
        }
    }

    /**
     * Delete an existing post
     * Requires w_member_social scope
     */
    public deletePost = async (
        { postUrn }: { postUrn: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            console.log(`Deleting LinkedIn post ${postUrn}`);

            await axios.delete(
                `https://api.linkedin.com/rest/posts/${encodeURIComponent(postUrn)}`,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            return {
                content: [
                    {
                        type: "text",
                        text: `Post deleted successfully!`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'post deletion');
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

            const initRequest = {
                initializeUploadRequest: {
                    owner: `urn:li:person:${userId}`,
                    purpose: "SHARE",
                    fileFormat: "image/jpeg",
                    fileSize: 1024 * 1024 // 1MB placeholder, will be adjusted with actual size
                }
            };

            const response = await axios.post(
                'https://api.linkedin.com/rest/images?action=initializeUpload',
                initRequest,
                {
                    headers: {
                        ...this.getLinkedInHeaders(linkedinTokens.access_token),
                        'LinkedIn-Action': 'initializeUpload'
                    }
                }
            );

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
    public createImagePost = async (
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

            // Restructured to comply with LinkedIn Share API schema
            // Removed unsupported fields: lifecycleState, visibility, isReshareDisabledByAuthor
            const postData = {
                author: `urn:li:person:${userId}`,
                commentary: content,
                distribution: {
                    feedDistribution: "MAIN_FEED",
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                content: {
                    media: {
                        title: title,
                        id: imageUrn
                    }
                }
                // LinkedIn automatically handles publishing with w_member_social scope
            };

            console.log('Creating LinkedIn image post with data:', JSON.stringify(postData, null, 2));

            const response = await axios.post(
                'https://api.linkedin.com/rest/posts',
                postData,
                {
                    headers: this.getLinkedInHeaders(linkedinTokens.access_token)
                }
            );

            return {
                content: [
                    {
                        type: "text",
                        text: `Image post successfully published to LinkedIn! Post URN: ${response.data.id || 'Created'}`
                    }
                ]
            };
        } catch (e: any) {
            return this.handleLinkedInError(e, 'image post creation');
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

            // Enhanced prompt with LinkedIn-specific instructions
            const enhancedPrompt = `
            Analyze this image and create a professional LinkedIn post for ${userName} based on the following instructions: ${prompt}
            
            Guidelines for the LinkedIn post:
            1. Keep it professional and engaging
            2. Include relevant hashtags (3-5 max)
            3. Aim for 150-250 words (staying under 3000 characters for LinkedIn's limit)
            4. Include a clear call-to-action
            5. Maintain a positive and professional tone
            6. Format with appropriate line breaks for readability
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
                                { text: enhancedPrompt },
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

    /**
     * Create a post with an image using LinkedIn's modern UGC Posts endpoint
     * This endpoint supports longer text (up to 3000 characters) and is the recommended way to create posts with media
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

    // Other tool methods can be added here as needed
} 