import axios from 'axios';

export interface LinkedInPost {
    id: string;
    commentary: string;
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    createdAt: string;
    updatedAt?: string;
    author: {
        name: string;
        profilePicture?: string;
        id: string;
    };
    engagement?: {
        likes: number;
        comments: number;
        shares: number;
        reactions?: Array<{
            type: string;
            count: number;
        }>;
    };
    lifecycleState: 'DRAFT' | 'PUBLISHED' | 'PUBLISHED_EDITED';
    content?: {
        media?: {
            title?: string;
            id: string;
        };
        multiImage?: {
            images: Array<{
                id: string;
                altText?: string;
            }>;
        };
        article?: {
            source: string;
            title?: string;
            description?: string;
        };
    };
}

export interface PostsResponse {
    posts: LinkedInPost[];
    total: number;
    hasMore: boolean;
    nextCursor?: string;
}

export interface CreatePostRequest {
    commentary: string;
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    authorId?: string;
}

export interface UpdatePostRequest {
    postUrn: string;
    commentary?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
}

export interface DeletePostRequest {
    postUrn: string;
}

// Create MCP client for API communication
const createMcpClient = (token: string) => {
    return {
        callTool: async (toolName: string, params: any) => {
            try {
                // Use longer timeout for image processing tools
                const isImageTool = toolName.includes('image') || toolName.includes('analyze');
                const timeout = isImageTool ? 60000 : 30000; // 60 seconds for image tools, 30 for others

                const response = await axios.post(`${import.meta.env.VITE_MCP_SERVER_URL}/mcp`, {
                    type: "call-tool",
                    tool: toolName,
                    params
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout
                });

                if (response.data.isError) {
                    throw new Error(response.data.content[0].text);
                }

                return JSON.parse(response.data.content[0].text);
            } catch (error: any) {
                if (error.response?.status === 401) {
                    throw new Error('Authentication expired. Please reconnect your LinkedIn account.');
                }
                throw error;
            }
        }
    };
};

export class LinkedInPostService {
    private mcpClient: ReturnType<typeof createMcpClient>;

    constructor(authToken: string) {
        this.mcpClient = createMcpClient(authToken);
    }

    /**
     * Get user's LinkedIn posts from our tracking database
     * Since LinkedIn API doesn't provide a way to get user's own posts,
     * we track posts created through our app in our database
     */
    async getUserPosts(limit: number = 20): Promise<PostsResponse> {
        try {
            console.log('📝 Fetching tracked posts from database...');

            // Get tracked posts from our database
            const result = await this.mcpClient.callTool('get-tracked-posts', {
                limit
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to fetch tracked posts');
            }

            // Convert tracked posts to our LinkedInPost format
            const trackedPosts = result.posts || [];

            // Debug: Log what we received from the backend
            console.log('📝 Frontend: Received posts from backend:', trackedPosts.length);
            trackedPosts.forEach((post: any, index: number) => {
                console.log(`📝 Frontend: Post ${index + 1} content length: ${post.content?.length || 0} chars`);
                console.log(`📝 Frontend: Post ${index + 1} content preview: "${post.content?.substring(0, 100)}..."`);
            });

            const convertedPosts: LinkedInPost[] = trackedPosts.map((post: any) => ({
                id: post.linkedin_post_urn,
                commentary: post.content,
                visibility: post.visibility,
                createdAt: post.created_at,
                updatedAt: post.updated_at,
                author: {
                    name: 'You', // We know it's the current user
                    id: post.user_id,
                    profilePicture: undefined
                },
                engagement: post.engagement_stats ? {
                    likes: post.engagement_stats.likes || 0,
                    comments: post.engagement_stats.comments || 0,
                    shares: post.engagement_stats.shares || 0,
                    reactions: post.engagement_stats.reactions || []
                } : {
                    likes: 0,
                    comments: 0,
                    shares: 0
                },
                lifecycleState: post.updated_at ? 'PUBLISHED_EDITED' : 'PUBLISHED'
            }));

            console.log(`✅ Retrieved ${convertedPosts.length} tracked posts`);

            return {
                posts: convertedPosts,
                total: convertedPosts.length,
                hasMore: false // For now, we don't implement pagination
            };

        } catch (error: any) {
            console.error('❌ Error fetching tracked posts:', error);

            // Fallback to mock data if database fails
            console.log('⚠️ Falling back to mock data...');
            const mockPosts: LinkedInPost[] = [
                {
                    id: 'urn:li:share:7012345678901234567',
                    commentary: '🚀 Excited to share my latest project! Building an AI-powered LinkedIn content management tool with PostWizz. The future of social media automation is here! #AI #LinkedIn #PostWizz #Innovation',
                    visibility: 'PUBLIC',
                    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    author: {
                        name: 'You',
                        id: 'current-user',
                        profilePicture: undefined
                    },
                    engagement: {
                        likes: 24,
                        comments: 5,
                        shares: 3,
                        reactions: [
                            { type: 'LIKE', count: 15 },
                            { type: 'PRAISE', count: 6 },
                            { type: 'INTEREST', count: 3 }
                        ]
                    },
                    lifecycleState: 'PUBLISHED'
                },
                {
                    id: 'urn:li:share:7012345678901234568',
                    commentary: 'Just finished an amazing workshop on modern web development! 💻\n\nKey takeaways:\n✅ TypeScript is essential for large projects\n✅ React hooks revolutionize state management\n✅ Always test your code thoroughly\n✅ Performance optimization matters\n\nWhat\'s your favorite development practice? Share in the comments! 👇',
                    visibility: 'CONNECTIONS',
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                    author: {
                        name: 'You',
                        id: 'current-user',
                        profilePicture: undefined
                    },
                    engagement: {
                        likes: 18,
                        comments: 2,
                        shares: 1,
                        reactions: [
                            { type: 'LIKE', count: 12 },
                            { type: 'APPRECIATION', count: 4 },
                            { type: 'INTEREST', count: 2 }
                        ]
                    },
                    lifecycleState: 'PUBLISHED_EDITED'
                },
                {
                    id: 'urn:li:share:7012345678901234569',
                    commentary: 'Thrilled to announce that our team just launched a new feature! 🎉\n\nAfter months of hard work, we\'ve successfully implemented real-time collaboration tools that will help teams work more efficiently.\n\nSpecial thanks to everyone who contributed to this milestone. Teamwork makes the dream work! 🙌\n\n#TeamWork #ProductLaunch #Innovation #Collaboration',
                    visibility: 'PUBLIC',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    author: {
                        name: 'You',
                        id: 'current-user',
                        profilePicture: undefined
                    },
                    engagement: {
                        likes: 42,
                        comments: 8,
                        shares: 6,
                        reactions: [
                            { type: 'LIKE', count: 25 },
                            { type: 'PRAISE', count: 10 },
                            { type: 'APPRECIATION', count: 5 },
                            { type: 'INTEREST', count: 2 }
                        ]
                    },
                    lifecycleState: 'PUBLISHED'
                }
            ];

            return {
                posts: mockPosts,
                total: mockPosts.length,
                hasMore: false
            };
        }
    }

    /**
     * Create a new LinkedIn post
     */
    async createPost(request: CreatePostRequest): Promise<{ success: boolean; postId?: string; error?: string }> {
        try {
            console.log('📝 Creating LinkedIn post...');

            const result = await this.mcpClient.callTool('linkedin-rest-create-post', {
                commentary: request.commentary,
                visibility: request.visibility,
                authorId: request.authorId
            });

            return {
                success: result.success,
                postId: result.postId,
                error: result.error
            };
        } catch (error: any) {
            console.error('❌ Error creating post:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update an existing LinkedIn post
     */
    async updatePost(request: UpdatePostRequest): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('✏️ Updating LinkedIn post:', request.postUrn);

            const result = await this.mcpClient.callTool('linkedin-rest-update-post', {
                postUrn: request.postUrn,
                commentary: request.commentary,
                visibility: request.visibility
            });

            return {
                success: result.success,
                error: result.error
            };
        } catch (error: any) {
            console.error('❌ Error updating post:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete a LinkedIn post
     */
    async deletePost(request: DeletePostRequest): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🗑️ Deleting LinkedIn post:', request.postUrn);

            const result = await this.mcpClient.callTool('linkedin-rest-delete-post', {
                postUrn: request.postUrn
            });

            return {
                success: result.success,
                error: result.error
            };
        } catch (error: any) {
            console.error('❌ Error deleting post:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get reactions for a specific post
     */
    async getPostReactions(postUrn: string, reactionType?: string): Promise<{
        success: boolean;
        reactions?: Array<{
            reactionType: string;
            actor: string;
        }>;
        count?: number;
        error?: string;
    }> {
        try {
            console.log('👍 Fetching post reactions:', postUrn);

            const result = await this.mcpClient.callTool('linkedin-rest-find-reactions', {
                entityUrn: postUrn,
                reactionType
            });

            return {
                success: result.success,
                reactions: result.reactions,
                count: result.count,
                error: result.error
            };
        } catch (error: any) {
            console.error('❌ Error fetching reactions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update authentication token
     */
    updateAuthToken(newToken: string): void {
        this.mcpClient = createMcpClient(newToken);
    }
}

export default LinkedInPostService;
