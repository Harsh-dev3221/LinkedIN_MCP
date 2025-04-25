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
    // Get user profile information from LinkedIn
    public getUserInfo = async (
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            const response = await axios.get(
                'https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))',
                {
                    headers: {
                        'Authorization': `Bearer ${linkedinTokens.access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const userData = response.data;
            const firstName = userData.firstName.localized[Object.keys(userData.firstName.localized)[0]];
            const lastName = userData.lastName.localized[Object.keys(userData.lastName.localized)[0]];

            let profilePictureUrl = null;
            if (userData.profilePicture &&
                userData.profilePicture['displayImage~'] &&
                userData.profilePicture['displayImage~'].elements &&
                userData.profilePicture['displayImage~'].elements.length > 0) {
                profilePictureUrl = userData.profilePicture['displayImage~'].elements[0].identifiers[0].identifier;
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            id: userData.id,
                            firstName,
                            lastName,
                            profilePictureUrl
                        })
                    }
                ]
            };
        } catch (e: any) {
            return {
                isError: true,
                content: [{ type: "text", text: `Error getting user info: ${e.message || 'Unknown error'}` }]
            };
        }
    }

    // Create a post on LinkedIn
    public createPost = async (
        { content }: { content: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            // Using LinkedIn Share API v2
            const postData = {
                owner: 'urn:li:person:' + await this.getUserId(linkedinTokens),
                text: {
                    text: content
                },
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: 'PUBLISHED',
                visibility: 'PUBLIC'
            };

            const response = await axios.post(
                'https://api.linkedin.com/v2/shares',
                postData,
                {
                    headers: {
                        'Authorization': `Bearer ${linkedinTokens.access_token}`,
                        'Content-Type': 'application/json',
                        'X-Restli-Protocol-Version': '2.0.0'
                    }
                }
            );

            return {
                content: [
                    {
                        type: "text",
                        text: `Post successfully published to LinkedIn! Post ID: ${response.data.id}`
                    }
                ]
            };
        } catch (e: any) {
            console.error('LinkedIn post creation error:', e.response?.data || e.message);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error creating LinkedIn post: ${e.response?.data?.message || e.message || 'Unknown error'}`
                }]
            };
        }
    }

    // Get user ID (helper method)
    private getUserId = async (linkedinTokens: OAuthTokens): Promise<string> => {
        try {
            const response = await axios.get('https://api.linkedin.com/v2/me', {
                headers: {
                    'Authorization': `Bearer ${linkedinTokens.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data.id;
        } catch (error) {
            console.error('Error getting user ID:', error);
            throw error;
        }
    }

    // Analyze image and create LinkedIn post content
    public analyzeImageAndCreateContent = async (
        { imageBase64, prompt, mimeType }: { imageBase64: string, prompt: string, mimeType: string },
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
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

            // Enhanced prompt with LinkedIn-specific instructions
            const enhancedPrompt = `
            Analyze this image and create a professional LinkedIn post for ${userName} based on the following instructions: ${prompt}
            
            Guidelines for the LinkedIn post:
            1. Keep it professional and engaging
            2. Include relevant hashtags (3-5 max)
            3. Aim for 150-250 words
            4. Include a clear call-to-action
            5. Maintain a positive and professional tone
            6. Format with appropriate line breaks for readability
            `;

            // Call Gemini API for image analysis and content creation
            const response = await axios.post(
                'https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent',
                {
                    contents: [
                        {
                            parts: [
                                { text: enhancedPrompt },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: imageBase64
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    params: { key: process.env.GEMINI_API_KEY },
                    headers: { 'Content-Type': 'application/json' }
                }
            );

            const generatedContent = response.data.candidates[0].content.parts[0].text;

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
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Error analyzing image: ${e.response?.data?.error?.message || e.message || 'Unknown error'}`
                }]
            };
        }
    }

    // Other tool methods can be added here as needed
} 