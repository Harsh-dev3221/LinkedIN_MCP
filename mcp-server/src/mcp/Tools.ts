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
    // LinkedIn API version to use for all requests
    private readonly LINKEDIN_API_VERSION = '202504';
    private readonly LINKEDIN_PROTOCOL_VERSION = '2.0.0';

    // Get user profile information from LinkedIn
    public getUserInfo = async (
        linkedinTokens: OAuthTokens
    ): Promise<CallToolResult> => {
        try {
            const response = await axios.get(
                'https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~:playableStreams))',
                {
                    headers: {
                        'Authorization': `Bearer ${linkedinTokens.access_token}`,
                        'Content-Type': 'application/json',
                        'LinkedIn-Version': this.LINKEDIN_API_VERSION,
                        'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
                    }
                }
            );

            const userData = response.data;
            const firstName = userData.localizedFirstName || '';
            const lastName = userData.localizedLastName || '';

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
            if (axios.isAxiosError(e)) {
                console.error('LinkedIn getUserInfo error details:', {
                    status: e.response?.status,
                    statusText: e.response?.statusText,
                    data: e.response?.data,
                    headers: e.config?.headers
                });
            }
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
                        'LinkedIn-Version': this.LINKEDIN_API_VERSION,
                        'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
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
            if (axios.isAxiosError(e)) {
                console.error('LinkedIn post creation error details:', {
                    status: e.response?.status,
                    statusText: e.response?.statusText,
                    data: e.response?.data,
                    headers: e.config?.headers
                });
            } else {
                console.error('LinkedIn post creation error:', e.message);
            }
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
            // Only request the specific fields you need with explicit projection
            const response = await axios.get('https://api.linkedin.com/v2/me?projection=(id)', {
                headers: {
                    'Authorization': `Bearer ${linkedinTokens.access_token}`,
                    'Content-Type': 'application/json',
                    'LinkedIn-Version': this.LINKEDIN_API_VERSION,
                    'X-Restli-Protocol-Version': this.LINKEDIN_PROTOCOL_VERSION
                }
            });
            return response.data.id;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('LinkedIn getUserId error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.config?.headers
                });
            }
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
            3. Aim for 150-250 words
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

            console.log("Successfully generated content with Gemini API");

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

    // Other tool methods can be added here as needed
} 