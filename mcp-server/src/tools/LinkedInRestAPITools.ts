import { LinkedInRestAPIService, LinkedInPost, LinkedInReaction, LinkedInVideo } from '../services/LinkedInRestAPIService.js';
import PostTrackingService from '../services/PostTrackingService.js';

interface CallToolResult {
    content: Array<{
        type: string;
        text: string;
    }>;
}

export class LinkedInRestAPITools {
    private apiService: LinkedInRestAPIService | null = null;
    private postTrackingService: PostTrackingService;

    constructor() {
        this.postTrackingService = new PostTrackingService();
    }

    /**
     * Initialize the API service with access token
     */
    private initializeService(accessToken: string): void {
        this.apiService = new LinkedInRestAPIService(accessToken);
    }

    /**
     * Create standardized success response
     */
    private createSuccessResponse(data: any, message: string): CallToolResult {
        return {
            content: [{
                type: "text",
                text: JSON.stringify(data, null, 2)
            }]
        };
    }

    /**
     * Create standardized error response
     */
    private createErrorResponse(error: string): CallToolResult {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: false,
                    error
                }, null, 2)
            }]
        };
    }

    /**
     * Execute API operation with standardized error handling
     */
    private async executeOperation<T>(
        operation: () => Promise<T>,
        successMessage: string,
        errorContext: string
    ): Promise<CallToolResult> {
        try {
            const result = await operation();
            return this.createSuccessResponse(result, successMessage);
        } catch (error: any) {
            console.error(`❌ ${errorContext}:`, error.message);
            return this.createErrorResponse(error.message);
        }
    }

    /**
     * Create a new LinkedIn post using REST API
     */
    public async createPost(params: {
        accessToken: string;
        commentary: string;
        visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
        authorId?: string;
        userId?: string; // For post tracking
        tokensUsed?: number; // For post tracking
    }): Promise<CallToolResult> {
        try {
            this.initializeService(params.accessToken);

            // Get author ID if not provided
            const authorId = params.authorId || await this.apiService!.getCurrentMemberId();

            const postData: LinkedInPost = {
                author: `urn:li:person:${authorId}`,
                commentary: params.commentary,
                visibility: params.visibility || 'PUBLIC',
                distribution: {
                    feedDistribution: 'MAIN_FEED',
                    targetEntities: [],
                    thirdPartyDistributionChannels: []
                },
                lifecycleState: 'PUBLISHED'
            };

            const result = await this.apiService!.createPost(postData);

            // Track the post if creation was successful and we have user info
            if (result.success && result.data?.id && params.userId) {
                try {
                    await this.postTrackingService.trackPost({
                        userId: params.userId,
                        linkedinPostId: result.data.id.split(':').pop() || result.data.id,
                        linkedinPostUrn: result.data.id,
                        content: params.commentary,
                        visibility: params.visibility || 'PUBLIC',
                        postType: 'text', // Default to text, can be enhanced later
                        tokensUsed: params.tokensUsed || 0
                    });
                    console.log('✅ Post tracked successfully');
                } catch (trackingError: any) {
                    console.error('⚠️ Failed to track post (post still created):', trackingError.message);
                }
            }

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        postId: result.data?.id,
                        message: result.success ? 'Post created successfully!' : result.error,
                        statusCode: result.statusCode
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Delete a LinkedIn post
     */
    public async deletePost(params: {
        accessToken: string;
        postUrn: string;
    }): Promise<CallToolResult> {
        return this.executeOperation(
            async () => {
                this.initializeService(params.accessToken);
                const result = await this.apiService!.deletePost(params.postUrn);
                return {
                    success: result.success,
                    message: result.success ? 'Post deleted successfully!' : result.error,
                    statusCode: result.statusCode
                };
            },
            'Post deleted successfully!',
            'Failed to delete post'
        );
    }

    /**
     * Update a LinkedIn post
     */
    public async updatePost(params: {
        accessToken: string;
        postUrn: string;
        commentary?: string;
        // Note: visibility cannot be updated after post creation (LinkedIn API limitation)
    }): Promise<CallToolResult> {
        return this.executeOperation(
            async () => {
                this.initializeService(params.accessToken);

                const updates: Partial<LinkedInPost> = {};
                if (params.commentary) updates.commentary = params.commentary;
                // Note: visibility is a create-only field and cannot be updated after post creation

                const result = await this.apiService!.updatePost(params.postUrn, updates);
                return {
                    success: result.success,
                    message: result.success ? 'Post updated successfully!' : result.error,
                    updatedPost: result.data,
                    statusCode: result.statusCode
                };
            },
            'Post updated successfully!',
            'Failed to update post'
        );
    }

    /**
     * Delete a reaction from a post
     */
    public async deleteReaction(params: {
        accessToken: string;
        reactionId: string;
    }): Promise<CallToolResult> {
        return this.executeOperation(
            async () => {
                this.initializeService(params.accessToken);
                const result = await this.apiService!.deleteReaction(params.reactionId);
                return {
                    success: result.success,
                    message: result.success ? 'Reaction deleted successfully!' : result.error,
                    statusCode: result.statusCode
                };
            },
            'Reaction deleted successfully!',
            'Failed to delete reaction'
        );
    }

    /**
     * Update a reaction on a post
     */
    public async updateReaction(params: {
        accessToken: string;
        reactionId: string;
        reactionType: 'LIKE' | 'PRAISE' | 'APPRECIATION' | 'EMPATHY' | 'INTEREST' | 'ENTERTAINMENT';
    }): Promise<CallToolResult> {
        try {
            this.initializeService(params.accessToken);

            const result = await this.apiService!.updateReaction(params.reactionId, params.reactionType);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        message: result.success ? 'Reaction updated successfully!' : result.error,
                        updatedReaction: result.data,
                        statusCode: result.statusCode
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Find reactions for a specific entity (post)
     */
    public async findReactions(params: {
        accessToken: string;
        entityUrn: string;
        reactionType?: string;
    }): Promise<CallToolResult> {
        try {
            this.initializeService(params.accessToken);

            const result = await this.apiService!.findReactions(params.entityUrn, params.reactionType);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        reactions: result.data,
                        count: result.data?.length || 0,
                        message: result.success ? 'Reactions retrieved successfully!' : result.error,
                        statusCode: result.statusCode
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Get multiple videos by their IDs
     */
    public async getVideos(params: {
        accessToken: string;
        videoIds: string[];
    }): Promise<CallToolResult> {
        try {
            this.initializeService(params.accessToken);

            const result = await this.apiService!.getVideos(params.videoIds);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        videos: result.data,
                        count: result.data?.length || 0,
                        message: result.success ? 'Videos retrieved successfully!' : result.error,
                        statusCode: result.statusCode
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Get user's tracked posts (posts created through our app)
     */
    public async getTrackedPosts(params: {
        userId: string;
        limit?: number;
    }): Promise<CallToolResult> {
        try {
            console.log('📋 Getting tracked posts for user:', params.userId);

            const result = await this.postTrackingService.getUserPosts(
                params.userId,
                params.limit || 20
            );

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        posts: result.posts || [],
                        count: result.posts?.length || 0,
                        message: result.success ? 'Posts retrieved successfully!' : result.error
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Initialize video upload process
     */
    public async initializeVideoUpload(params: {
        accessToken: string;
        authorId?: string;
        title?: string;
        description?: string;
        fileSizeBytes: number;
        uploadCaptions?: boolean;
        uploadThumbnail?: boolean;
    }): Promise<CallToolResult> {
        try {
            this.initializeService(params.accessToken);

            // Get author ID if not provided
            const authorId = params.authorId || await this.apiService!.getCurrentMemberId();

            const videoData = {
                author: `urn:li:person:${authorId}`,
                title: params.title,
                description: params.description,
                fileSizeBytes: params.fileSizeBytes,
                uploadCaptions: params.uploadCaptions || false,
                uploadThumbnail: params.uploadThumbnail || false
            };

            const result = await this.apiService!.initializeVideoUpload(videoData);

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: result.success,
                        videoUrn: result.data?.video,
                        uploadInstructions: result.data?.uploadInstructions,
                        message: result.success ? 'Video upload initialized successfully!' : result.error,
                        statusCode: result.statusCode
                    }, null, 2)
                }]
            };
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }]
            };
        }
    }
}
