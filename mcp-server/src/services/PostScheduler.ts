import * as cron from 'node-cron';
import { supabase } from '../database/supabase.js';
import { Tools } from '../mcp/Tools.js';

export class PostScheduler {
    private isRunning: boolean = false;
    private tools: Tools;

    constructor() {
        this.tools = new Tools();
    }

    /**
     * Start the post publishing scheduler
     * Checks for pending posts every minute and publishes them when their time arrives
     */
    start(): void {
        if (this.isRunning) {
            console.log('Post scheduler is already running');
            return;
        }

        // Check for posts to publish every minute
        cron.schedule('* * * * *', async () => {
            try {
                await this.checkAndPublishPosts();
            } catch (error) {
                console.error('Error during scheduled post check:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC'
        });

        this.isRunning = true;
        console.log('🚀 Post scheduler started successfully');
        console.log('📅 - Checking for posts to publish every minute');
    }

    /**
     * Stop the scheduler
     */
    stop(): void {
        this.isRunning = false;
        console.log('📅 Post scheduler stopped');
    }

    /**
     * Check for pending posts that need to be published
     * Handles all overdue scenarios with comprehensive error handling
     */
    private async checkAndPublishPosts(): Promise<void> {
        try {
            // First, get all pending posts that are due for publishing
            const { data: duePosts, error: duePostsError } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_time', new Date().toISOString())
                .order('scheduled_time', { ascending: true });

            if (duePostsError) {
                console.error('Error fetching due posts:', duePostsError);
                return;
            }

            if (!duePosts || duePosts.length === 0) {
                return; // No posts to publish
            }

            console.log(`📅 Found ${duePosts.length} posts that are due for publishing`);

            // Process LinkedIn connections concurrently for better performance
            const postsWithConnections: any[] = [];
            const postsWithoutConnections: any[] = [];

            // Use Promise.allSettled for concurrent processing with error handling
            const connectionPromises = duePosts.map(async (post) => {
                try {
                    // Get LinkedIn connection for this user
                    const { data: linkedinConnection, error: connectionError } = await supabase
                        .from('linkedin_connections')
                        .select('linkedin_access_token, linkedin_user_id')
                        .eq('user_id', post.user_id)
                        .gt('expires_at', new Date().toISOString()) // Only non-expired tokens
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (connectionError || !linkedinConnection) {
                        console.log(`⚠️ No valid LinkedIn connection for user ${post.user_id}, post ${post.id}`);
                        return { post, hasConnection: false };
                    } else {
                        return {
                            post: { ...post, linkedinConnection },
                            hasConnection: true
                        };
                    }
                } catch (error) {
                    console.error(`Error checking LinkedIn connection for post ${post.id}:`, error);
                    return { post, hasConnection: false };
                }
            });

            // Wait for all connection checks to complete
            const connectionResults = await Promise.allSettled(connectionPromises);

            connectionResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    if (result.value.hasConnection) {
                        postsWithConnections.push(result.value.post);
                    } else {
                        postsWithoutConnections.push(result.value.post);
                    }
                } else {
                    console.error('Connection check failed:', result.reason);
                }
            });

            console.log(`✅ ${postsWithConnections.length} posts have valid LinkedIn connections`);
            console.log(`⚠️ ${postsWithoutConnections.length} posts missing LinkedIn connections`);

            // Handle posts without connections concurrently (mark as failed)
            if (postsWithoutConnections.length > 0) {
                const failurePromises = postsWithoutConnections.map(post =>
                    this.markPostAsFailed(post, 'No valid LinkedIn connection found for user')
                );
                await Promise.allSettled(failurePromises);
            }

            // Process posts with connections
            if (postsWithConnections.length > 0) {
                // Categorize posts by how overdue they are
                const now = new Date();
                const categorizedPosts = this.categorizeOverduePosts(postsWithConnections, now);

                // Handle each category with different strategies
                // Process categories in parallel but with controlled concurrency
                await Promise.allSettled([
                    this.handleCriticallyOverdue(categorizedPosts.criticallyOverdue),
                    this.handleSeverelyOverdue(categorizedPosts.severelyOverdue),
                    this.handleModeratelyOverdue(categorizedPosts.moderatelyOverdue),
                    this.handleRecentlyOverdue(categorizedPosts.recentlyOverdue),
                    this.handleOnTime(categorizedPosts.onTime)
                ]);
            }

        } catch (error) {
            console.error('Error in checkAndPublishPosts:', error);
        }
    }

    /**
     * Mark a post as failed with error message
     */
    private async markPostAsFailed(post: any, errorMessage: string): Promise<void> {
        try {
            // Use optimistic locking to prevent race conditions
            const { data: updateResult, error: updateError } = await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: errorMessage,
                    updated_at: new Date().toISOString()
                })
                .eq('id', post.id)
                .eq('status', 'pending') // Only update if still pending
                .select();

            if (updateError) {
                console.error(`Error marking post ${post.id} as failed:`, updateError);
                return;
            }

            if (!updateResult || updateResult.length === 0) {
                console.log(`⚠️ Post ${post.id} was already processed by another instance - skipping failure marking`);
                return;
            }

            console.log(`❌ Marked post ${post.id} as failed: ${errorMessage}`);

            // Log activity
            await this.logActivity(post.user_id, 'scheduled_post_failed',
                `Scheduled post failed: ${errorMessage}`, {
                scheduled_post_id: post.id,
                error_message: errorMessage,
                scheduled_time: post.scheduled_time
            });
        } catch (error) {
            console.error(`Error marking post ${post.id} as failed:`, error);
        }
    }

    /**
     * Categorize posts by how overdue they are
     */
    private categorizeOverduePosts(posts: any[], now: Date) {
        const categories = {
            criticallyOverdue: [] as any[], // > 7 days overdue
            severelyOverdue: [] as any[],   // 1-7 days overdue
            moderatelyOverdue: [] as any[], // 1-24 hours overdue
            recentlyOverdue: [] as any[],   // 5 minutes - 1 hour overdue
            onTime: [] as any[]             // Due now (within 5 minutes)
        };

        posts.forEach(post => {
            const scheduledTime = new Date(post.scheduled_time);
            const overdueMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

            if (overdueMinutes > 7 * 24 * 60) { // > 7 days
                categories.criticallyOverdue.push(post);
            } else if (overdueMinutes > 24 * 60) { // 1-7 days
                categories.severelyOverdue.push(post);
            } else if (overdueMinutes > 60) { // 1-24 hours
                categories.moderatelyOverdue.push(post);
            } else if (overdueMinutes > 5) { // 5 minutes - 1 hour
                categories.recentlyOverdue.push(post);
            } else { // Within 5 minutes or due now
                categories.onTime.push(post);
            }
        });

        return categories;
    }

    /**
     * Publish a single scheduled post with overdue handling options
     */
    private async publishScheduledPost(post: any, options?: {
        addOverdueWarning?: boolean;
        overdueTime?: string;
        priority?: 'high' | 'normal' | 'low';
    }): Promise<void> {
        try {
            console.log(`📤 Publishing scheduled post ${post.id} for user ${post.user_id}`);

            // Get LinkedIn connection info from the new structure
            const linkedinConnection = post.linkedinConnection;
            if (!linkedinConnection) {
                throw new Error('No LinkedIn connection found for user');
            }

            // Prepare content with overdue warning if needed
            let finalContent = post.content;
            if (options?.addOverdueWarning && options?.overdueTime) {
                finalContent = `${post.content}\n\n⏰ Note: This post was scheduled earlier but was ${options.overdueTime}.`;
            }

            // Publish the post using LinkedIn API
            const linkedinTokens = {
                access_token: linkedinConnection.linkedin_access_token,
                token_type: 'Bearer',
                refresh_token: undefined,
                scope: 'openid profile email w_member_social' // Add OpenID Connect scopes as string
            };

            // Use the UGC post creation method for text posts
            const result = await this.tools.createUgcPost(
                { content: finalContent },
                linkedinTokens
            );

            // Extract LinkedIn post ID from the response
            let linkedinPostId: string = 'unknown';
            if (result.content && result.content[0] && result.content[0].text) {
                const responseText = result.content[0].text;
                const idMatch = responseText.match(/Post URN: (.+)/);
                if (idMatch) {
                    linkedinPostId = idMatch[1];
                }
            }

            // Update post status to published with optimistic locking
            // Only update if status is still 'pending' to prevent race conditions
            const publishedAt = new Date().toISOString();
            const { data: updateResult, error: updateError } = await supabase
                .from('scheduled_posts')
                .update({
                    status: 'published',
                    linkedin_post_id: linkedinPostId,
                    published_at: publishedAt,
                    updated_at: publishedAt
                })
                .eq('id', post.id)
                .eq('status', 'pending') // Optimistic locking - only update if still pending
                .select();

            if (updateError) {
                console.error(`Error updating post ${post.id} status:`, updateError);
                return;
            }

            if (!updateResult || updateResult.length === 0) {
                console.log(`⚠️ Post ${post.id} was already processed by another instance - skipping`);
                return;
            }

            // Log activity with overdue information
            const activityDescription = options?.overdueTime
                ? `Scheduled post published (${options.overdueTime}): ${post.content.substring(0, 50)}...`
                : `Scheduled post published: ${post.content.substring(0, 50)}...`;

            await this.logActivity(post.user_id, 'scheduled_post_published', activityDescription, {
                scheduled_post_id: post.id,
                linkedin_post_id: linkedinPostId,
                post_type: post.post_type,
                scheduled_time: post.scheduled_time,
                overdue_time: options?.overdueTime || null,
                priority: options?.priority || 'normal'
            });

            console.log(`✅ Successfully published scheduled post ${post.id}`);

        } catch (error) {
            console.error(`❌ Failed to publish scheduled post ${post.id}:`, error);

            // Update post status to failed
            await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error',
                    updated_at: new Date().toISOString()
                })
                .eq('id', post.id);
        }
    }

    /**
     * Handle critically overdue posts (> 7 days)
     * Strategy: Mark as failed with explanation, notify user
     */
    private async handleCriticallyOverdue(posts: any[]): Promise<void> {
        if (posts.length === 0) return;

        console.log(`🚨 CRITICAL: ${posts.length} posts are critically overdue (>7 days)`);

        for (const post of posts) {
            const overdueTime = this.getOverdueTime(post.scheduled_time);
            console.log(`🚨 Marking critically overdue post as failed: ${post.id} (${overdueTime})`);

            await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: `Post was critically overdue (${overdueTime}) and automatically marked as failed. Please reschedule if still needed.`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', post.id);

            // Log critical failure
            await this.logActivity(post.user_id, 'scheduled_post_failed',
                `Critically overdue post marked as failed: ${post.content.substring(0, 50)}...`, {
                scheduled_post_id: post.id,
                overdue_time: overdueTime,
                reason: 'critically_overdue'
            });
        }
    }

    /**
     * Handle severely overdue posts (1-7 days)
     * Strategy: Try to publish with warning, or mark as failed if LinkedIn connection issues
     */
    private async handleSeverelyOverdue(posts: any[]): Promise<void> {
        if (posts.length === 0) return;

        console.log(`⚠️ SEVERE: ${posts.length} posts are severely overdue (1-7 days)`);

        for (const post of posts) {
            const overdueTime = this.getOverdueTime(post.scheduled_time);
            console.log(`⚠️ Attempting to publish severely overdue post: ${post.id} (${overdueTime})`);

            // Try to publish but with extra error handling
            try {
                await this.publishScheduledPost(post, {
                    addOverdueWarning: true,
                    overdueTime: overdueTime,
                    priority: 'low' // Lower priority for old posts
                });
            } catch (error) {
                console.error(`Failed to publish severely overdue post ${post.id}:`, error);

                // Mark as failed if can't publish
                await supabase
                    .from('scheduled_posts')
                    .update({
                        status: 'failed',
                        error_message: `Severely overdue post (${overdueTime}) failed to publish: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', post.id);
            }
        }
    }

    /**
     * Handle moderately overdue posts (1-24 hours)
     * Strategy: Publish with overdue notice and controlled concurrency
     */
    private async handleModeratelyOverdue(posts: any[]): Promise<void> {
        if (posts.length === 0) return;

        console.log(`⚠️ MODERATE: ${posts.length} posts are moderately overdue (1-24 hours)`);

        // Process moderately overdue posts with controlled concurrency
        await this.processConcurrentlyWithRateLimit(posts, {
            addOverdueWarning: true,
            priority: 'normal'
        }, 2, 1000); // 2 concurrent, 1000ms delay between batches
    }

    /**
     * Handle recently overdue posts (5 minutes - 1 hour)
     * Strategy: Publish normally with minor delay notice and controlled concurrency
     */
    private async handleRecentlyOverdue(posts: any[]): Promise<void> {
        if (posts.length === 0) return;

        console.log(`📅 RECENT: ${posts.length} posts are recently overdue (5min-1hr)`);

        // Process recently overdue posts with controlled concurrency
        await this.processConcurrentlyWithRateLimit(posts, {
            addOverdueWarning: false, // No warning for minor delays
            priority: 'normal'
        }, 2, 750); // 2 concurrent, 750ms delay between batches
    }

    /**
     * Handle on-time posts (due now)
     * Strategy: Publish immediately with highest priority and controlled concurrency
     */
    private async handleOnTime(posts: any[]): Promise<void> {
        if (posts.length === 0) return;

        console.log(`✅ ON-TIME: ${posts.length} posts are due now`);

        // Process on-time posts with controlled concurrency (max 3 at once)
        await this.processConcurrentlyWithRateLimit(posts, {
            addOverdueWarning: false,
            priority: 'high'
        }, 3, 500); // 3 concurrent, 500ms delay between batches
    }

    /**
     * Process posts concurrently with rate limiting to handle multiple users
     * This prevents overwhelming LinkedIn API and ensures fair processing
     */
    private async processConcurrentlyWithRateLimit(
        posts: any[],
        options: {
            addOverdueWarning?: boolean;
            overdueTime?: string;
            priority?: 'high' | 'normal' | 'low';
        },
        concurrency: number = 2,
        delayMs: number = 1000
    ): Promise<void> {
        // Group posts by user to ensure fair distribution
        const postsByUser = new Map<string, any[]>();
        posts.forEach(post => {
            const userId = post.user_id;
            if (!postsByUser.has(userId)) {
                postsByUser.set(userId, []);
            }
            postsByUser.get(userId)!.push(post);
        });

        console.log(`🔄 Processing ${posts.length} posts from ${postsByUser.size} users with concurrency ${concurrency}`);

        // Process posts in batches with controlled concurrency
        const allPosts = Array.from(postsByUser.values()).flat();
        for (let i = 0; i < allPosts.length; i += concurrency) {
            const batch = allPosts.slice(i, i + concurrency);

            // Process batch concurrently
            const batchPromises = batch.map(async (post) => {
                const overdueTime = options.overdueTime || this.getOverdueTime(post.scheduled_time);
                console.log(`📤 Processing post ${post.id} for user ${post.user_id} (${overdueTime})`);

                return this.publishScheduledPost(post, {
                    ...options,
                    overdueTime
                });
            });

            // Wait for batch to complete
            await Promise.allSettled(batchPromises);

            // Add delay between batches to respect rate limits
            if (i + concurrency < allPosts.length) {
                console.log(`⏳ Rate limiting: waiting ${delayMs}ms before next batch...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
    }

    /**
     * Log user activity
     */
    private async logActivity(userId: string, activityType: string, description: string, metadata: any): Promise<void> {
        try {
            await supabase
                .from('user_activities')
                .insert({
                    user_id: userId,
                    activity_type: activityType,
                    description: description,
                    metadata: metadata
                });
        } catch (error) {
            console.error('Error logging activity:', error);
            // Don't throw - activity logging shouldn't break the main flow
        }
    }

    /**
     * Calculate human-readable overdue time
     */
    private getOverdueTime(scheduledTime: string): string {
        const now = new Date();
        const scheduled = new Date(scheduledTime);
        const diffMs = now.getTime() - scheduled.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} overdue`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} overdue`;
        } else {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} overdue`;
        }
    }

    /**
     * Manually trigger post publishing check
     */
    async triggerCheck(): Promise<void> {
        console.log('Manually triggering post publishing check...');
        await this.checkAndPublishPosts();
    }
}

// Create singleton instance
export const postScheduler = new PostScheduler();
