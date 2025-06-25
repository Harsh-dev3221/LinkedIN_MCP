import axios, { AxiosInstance } from 'axios';

export interface LinkedInPost {
    id?: string;
    author: string;
    commentary?: string;
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    distribution?: {
        feedDistribution: 'MAIN_FEED' | 'NONE';
        targetEntities?: string[];
        thirdPartyDistributionChannels?: string[];
    };
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
    lifecycleState?: 'DRAFT' | 'PUBLISHED' | 'PUBLISHED_EDITED';
    isReshareDisabledByAuthor?: boolean;
}

export interface LinkedInReaction {
    reactionType: 'LIKE' | 'PRAISE' | 'APPRECIATION' | 'EMPATHY' | 'INTEREST' | 'ENTERTAINMENT';
    actor: string;
}

export interface LinkedInVideo {
    id?: string;
    author: string;
    title?: string;
    description?: string;
    uploadUrl?: string;
    status?: 'PROCESSING' | 'AVAILABLE' | 'FAILED';
}

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    statusCode?: number;
}

export class LinkedInRestAPIService {
    private axiosInstance: AxiosInstance;
    private accessToken: string;

    // Use the same API version as our working post creation tools
    private readonly LINKEDIN_API_VERSION = '202505'; // May 2025 - matches Tools.ts

    constructor(accessToken: string) {
        this.accessToken = accessToken;
        this.axiosInstance = axios.create({
            baseURL: 'https://api.linkedin.com',
            timeout: 30000,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Restli-Protocol-Version': '2.0.0',
                'LinkedIn-Version': this.LINKEDIN_API_VERSION
            }
        });
    }

    /**
     * Get standard headers for LinkedIn REST API operations
     */
    private getHeaders(method?: 'DELETE' | 'PARTIAL_UPDATE'): Record<string, string> {
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
            'LinkedIn-Version': this.LINKEDIN_API_VERSION
        };

        if (method) {
            headers['X-RestLi-Method'] = method;
        }

        return headers;
    }

    /**
     * Handle API errors consistently
     */
    private handleError(error: any, operation: string): APIResponse<any> {
        console.error(`❌ Failed to ${operation}:`, error.response?.data || error.message);
        console.error(`❌ ${operation} error details:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data
        });

        return {
            success: false,
            error: error.response?.data?.message || error.message,
            statusCode: error.response?.status
        };
    }

    /**
     * CREATE /rest/posts - Create a new LinkedIn post
     */
    async createPost(postData: LinkedInPost): Promise<APIResponse<LinkedInPost>> {
        try {
            console.log('🚀 Creating LinkedIn post via REST API');

            const response = await this.axiosInstance.post('/rest/posts', postData);

            return {
                success: true,
                data: response.data,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'create post');
        }
    }

    /**
     * DELETE /rest/posts/{postUrn} - Delete a LinkedIn post
     */
    async deletePost(postUrn: string): Promise<APIResponse<void>> {
        try {
            console.log('🗑️ Deleting LinkedIn post:', postUrn);

            const response = await this.axiosInstance.delete(`/rest/posts/${encodeURIComponent(postUrn)}`, {
                headers: this.getHeaders('DELETE')
            });

            console.log('✅ Post deleted successfully, status:', response.status);
            return {
                success: true,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'delete post');
        }
    }

    /**
     * PARTIAL_UPDATE /rest/posts/{postUrn} - Update a LinkedIn post
     */
    async updatePost(postUrn: string, updates: Partial<LinkedInPost>): Promise<APIResponse<LinkedInPost>> {
        try {
            console.log('✏️ Updating LinkedIn post:', postUrn);
            console.log('✏️ Updates to apply:', updates);

            const patchData = {
                patch: {
                    $set: updates
                }
            };

            const response = await this.axiosInstance.post(`/rest/posts/${encodeURIComponent(postUrn)}`, patchData, {
                headers: this.getHeaders('PARTIAL_UPDATE')
            });

            return {
                success: true,
                data: response.data,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'update post');
        }
    }

    /**
     * DELETE /rest/reactions/{id} - Delete a reaction
     */
    async deleteReaction(reactionId: string): Promise<APIResponse<void>> {
        try {
            console.log('🗑️ Deleting reaction:', reactionId);

            const response = await this.axiosInstance.delete(`/rest/reactions/${encodeURIComponent(reactionId)}`);

            return {
                success: true,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'delete reaction');
        }
    }

    /**
     * PARTIAL_UPDATE /rest/reactions/{id} - Update a reaction
     */
    async updateReaction(reactionId: string, reactionType: LinkedInReaction['reactionType']): Promise<APIResponse<LinkedInReaction>> {
        try {
            console.log('✏️ Updating reaction:', reactionId, 'to', reactionType);

            const response = await this.axiosInstance.patch(`/rest/reactions/${encodeURIComponent(reactionId)}`, {
                patch: {
                    $set: {
                        reactionType
                    }
                }
            });

            return {
                success: true,
                data: response.data,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'update reaction');
        }
    }

    /**
     * FINDER entity /rest/reactions/{id} - Find reactions
     */
    async findReactions(entityUrn: string, reactionType?: string): Promise<APIResponse<LinkedInReaction[]>> {
        try {
            console.log('🔍 Finding reactions for entity:', entityUrn);

            let url = `/rest/reactions?q=entity&entity=${encodeURIComponent(entityUrn)}`;
            if (reactionType) {
                url += `&reactionType=${reactionType}`;
            }

            const response = await this.axiosInstance.get(url);

            return {
                success: true,
                data: response.data.elements || [],
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'find reactions');
        }
    }

    /**
     * BATCH_GET /rest/videos - Get multiple videos
     */
    async getVideos(videoIds: string[]): Promise<APIResponse<LinkedInVideo[]>> {
        try {
            console.log('📹 Getting videos:', videoIds);

            const ids = videoIds.map(id => encodeURIComponent(id)).join(',');
            const response = await this.axiosInstance.get(`/rest/videos?ids=List(${ids})`);

            return {
                success: true,
                data: Object.values(response.data.results || {}),
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'get videos');
        }
    }

    /**
     * ACTION initializeUpload /rest/videos - Initialize video upload
     */
    async initializeVideoUpload(videoData: {
        author: string;
        title?: string;
        description?: string;
        fileSizeBytes: number;
        uploadCaptions?: boolean;
        uploadThumbnail?: boolean;
    }): Promise<APIResponse<{
        video: string;
        uploadInstructions: Array<{
            uploadUrl: string;
            firstByte: number;
            lastByte: number;
        }>;
    }>> {
        try {
            console.log('📤 Initializing video upload');

            const response = await this.axiosInstance.post('/rest/videos?action=initializeUpload', {
                initializeUploadRequest: videoData
            });

            return {
                success: true,
                data: response.data.value,
                statusCode: response.status
            };
        } catch (error: any) {
            return this.handleError(error, 'initialize video upload');
        }
    }

    /**
     * Get current user's member ID for API calls
     */
    async getCurrentMemberId(): Promise<string> {
        try {
            const response = await this.axiosInstance.get('/v2/me');
            return response.data.id;
        } catch (error) {
            throw new Error('Failed to get current member ID');
        }
    }
}
