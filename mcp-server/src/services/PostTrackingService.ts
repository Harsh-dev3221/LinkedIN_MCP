import { supabase } from '../database/supabase.js';

export interface TrackedPost {
    id: string;
    user_id: string;
    linkedin_post_id: string;
    linkedin_post_urn: string;
    content: string;
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    created_at: string;
    updated_at?: string;
    is_deleted: boolean;
    engagement_stats?: {
        likes?: number;
        comments?: number;
        shares?: number;
        reactions?: Array<{
            type: string;
            count: number;
        }>;
    };
    post_type: 'text' | 'image' | 'video' | 'article';
    tokens_used: number;
}

export interface CreateTrackedPostRequest {
    userId: string;
    linkedinPostId: string;
    linkedinPostUrn: string;
    content: string;
    visibility: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    postType: 'text' | 'image' | 'video' | 'article';
    tokensUsed: number;
}

export interface UpdateTrackedPostRequest {
    linkedinPostUrn: string;
    content?: string;
    visibility?: 'PUBLIC' | 'CONNECTIONS' | 'LOGGED_IN_MEMBERS';
    engagementStats?: TrackedPost['engagement_stats'];
}

export class PostTrackingService {
    /**
     * Track a new post after successful LinkedIn creation
     */
    async trackPost(request: CreateTrackedPostRequest): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('📝 Tracking new LinkedIn post:', request.linkedinPostUrn);
            console.log('📝 Content length being tracked:', request.content?.length || 0);
            console.log('📝 Content preview being tracked:', request.content?.substring(0, 100) + '...');
            console.log('📝 Full content being tracked:', request.content);

            const { data, error } = await supabase
                .from('tracked_posts')
                .insert({
                    user_id: request.userId,
                    linkedin_post_id: request.linkedinPostId,
                    linkedin_post_urn: request.linkedinPostUrn,
                    content: request.content,
                    visibility: request.visibility,
                    post_type: request.postType,
                    tokens_used: request.tokensUsed,
                    is_deleted: false,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Error tracking post:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Post tracked successfully:', data.id);
            return { success: true };

        } catch (error: any) {
            console.error('❌ Error in trackPost:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get all tracked posts for a user
     */
    async getUserPosts(userId: string, limit: number = 20): Promise<{
        success: boolean;
        posts?: TrackedPost[];
        error?: string;
    }> {
        try {
            console.log('📋 Fetching tracked posts for user:', userId);

            const { data, error } = await supabase
                .from('tracked_posts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error('❌ Error fetching posts:', error);
                return { success: false, error: error.message };
            }

            console.log(`✅ Found ${data?.length || 0} tracked posts`);

            // Debug: Log content lengths
            if (data && data.length > 0) {
                data.forEach((post, index) => {
                    console.log(`📝 Post ${index + 1} content length: ${post.content?.length || 0} chars`);
                    console.log(`📝 Post ${index + 1} content preview: "${post.content?.substring(0, 100)}..."`);
                });
            }

            return { success: true, posts: data || [] };

        } catch (error: any) {
            console.error('❌ Error in getUserPosts:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update a tracked post after LinkedIn update
     */
    async updateTrackedPost(request: UpdateTrackedPostRequest): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('✏️ Updating tracked post:', request.linkedinPostUrn);

            const updateData: any = {
                updated_at: new Date().toISOString()
            };

            if (request.content) updateData.content = request.content;
            if (request.visibility) updateData.visibility = request.visibility;
            if (request.engagementStats) updateData.engagement_stats = request.engagementStats;

            const { error } = await supabase
                .from('tracked_posts')
                .update(updateData)
                .eq('linkedin_post_urn', request.linkedinPostUrn);

            if (error) {
                console.error('❌ Error updating tracked post:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Tracked post updated successfully');
            return { success: true };

        } catch (error: any) {
            console.error('❌ Error in updateTrackedPost:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mark a tracked post as deleted after LinkedIn deletion
     */
    async markPostDeleted(linkedinPostUrn: string): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('🗑️ Marking post as deleted:', linkedinPostUrn);

            const { error } = await supabase
                .from('tracked_posts')
                .update({
                    is_deleted: true,
                    updated_at: new Date().toISOString()
                })
                .eq('linkedin_post_urn', linkedinPostUrn);

            if (error) {
                console.error('❌ Error marking post as deleted:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Post marked as deleted successfully');
            return { success: true };

        } catch (error: any) {
            console.error('❌ Error in markPostDeleted:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Update engagement stats for a post
     */
    async updateEngagementStats(
        linkedinPostUrn: string,
        stats: TrackedPost['engagement_stats']
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('📊 Updating engagement stats for:', linkedinPostUrn);

            const { error } = await supabase
                .from('tracked_posts')
                .update({
                    engagement_stats: stats,
                    updated_at: new Date().toISOString()
                })
                .eq('linkedin_post_urn', linkedinPostUrn);

            if (error) {
                console.error('❌ Error updating engagement stats:', error);
                return { success: false, error: error.message };
            }

            console.log('✅ Engagement stats updated successfully');
            return { success: true };

        } catch (error: any) {
            console.error('❌ Error in updateEngagementStats:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get post analytics for dashboard
     */
    async getPostAnalytics(userId: string, timeframe: '7d' | '30d' | 'all' = '30d'): Promise<{
        success: boolean;
        analytics?: {
            totalPosts: number;
            totalEngagement: number;
            averageEngagement: number;
            postsByType: Record<string, number>;
            postsByVisibility: Record<string, number>;
            recentPosts: TrackedPost[];
        };
        error?: string;
    }> {
        try {
            console.log(`📈 Getting post analytics for user: ${userId}, timeframe: ${timeframe}`);

            let query = supabase
                .from('tracked_posts')
                .select('*')
                .eq('user_id', userId)
                .eq('is_deleted', false);

            // Apply timeframe filter
            if (timeframe !== 'all') {
                const days = timeframe === '7d' ? 7 : 30;
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - days);
                query = query.gte('created_at', cutoffDate.toISOString());
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching post analytics:', error);
                return { success: false, error: error.message };
            }

            const posts = data || [];

            // Calculate analytics
            const totalPosts = posts.length;
            const totalEngagement = posts.reduce((sum: number, post: TrackedPost) => {
                const stats = post.engagement_stats;
                if (!stats) return sum;
                return sum + (stats.likes || 0) + (stats.comments || 0) + (stats.shares || 0);
            }, 0);

            const averageEngagement = totalPosts > 0 ? totalEngagement / totalPosts : 0;

            const postsByType = posts.reduce((acc: Record<string, number>, post: TrackedPost) => {
                acc[post.post_type] = (acc[post.post_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const postsByVisibility = posts.reduce((acc: Record<string, number>, post: TrackedPost) => {
                acc[post.visibility] = (acc[post.visibility] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const analytics = {
                totalPosts,
                totalEngagement,
                averageEngagement,
                postsByType,
                postsByVisibility,
                recentPosts: posts.slice(0, 10) // Last 10 posts
            };

            console.log('✅ Post analytics calculated:', {
                totalPosts,
                totalEngagement,
                averageEngagement
            });

            return { success: true, analytics };

        } catch (error: any) {
            console.error('❌ Error in getPostAnalytics:', error);
            return { success: false, error: error.message };
        }
    }
}

export default PostTrackingService;
