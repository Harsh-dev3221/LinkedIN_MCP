import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { supabase, ScheduledPosts, PostType, ScheduledPostStatus } from "../database/supabase.js";

export class SchedulingTools {
    /**
     * Schedule a post for future publishing
     */
    public schedulePost = async (
        {
            userId,
            content,
            scheduledTime,
            postType = 'basic'
        }: {
            userId: string,
            content: string,
            scheduledTime: string, // ISO string
            postType?: 'basic' | 'single' | 'multiple'
        }
    ): Promise<CallToolResult> => {
        try {
            if (!content || content.trim().length === 0) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "Post content cannot be empty"
                    }]
                };
            }

            const scheduledDate = new Date(scheduledTime);
            const now = new Date();

            if (scheduledDate <= now) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "Scheduled time must be in the future"
                    }]
                };
            }

            const { data: scheduledPost, error } = await supabase
                .from('scheduled_posts')
                .insert([{
                    user_id: userId,
                    content: content.trim(),
                    post_type: postType,
                    scheduled_time: scheduledDate.toISOString(),
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to schedule post: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `⏰ Post scheduled successfully!\n\nScheduled ID: ${scheduledPost.id}\nScheduled for: ${scheduledDate.toLocaleString()}\nContent preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n\n💡 Your post will be automatically published at the scheduled time.`
                }]
            };
        } catch (error) {
            console.error('Error scheduling post:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to schedule post: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get all scheduled posts for a user
     */
    public getScheduledPosts = async (
        { userId, status, limit = 10, offset = 0 }: {
            userId: string,
            status?: 'pending' | 'published' | 'failed' | 'cancelled',
            limit?: number,
            offset?: number
        }
    ): Promise<CallToolResult> => {
        try {
            let query = supabase
                .from('scheduled_posts')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('scheduled_time', { ascending: true });

            if (status) {
                query = query.eq('status', status);
            }

            const { data: scheduledPosts, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Failed to fetch scheduled posts: ${error.message}`);
            }

            if (!scheduledPosts || scheduledPosts.length === 0) {
                const statusText = status ? ` with status "${status}"` : '';
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            success: true,
                            message: `⏰ No scheduled posts found${statusText}. Schedule your first post to get started!`,
                            data: [],
                            total: 0
                        })
                    }]
                };
            }

            // Process posts with additional metadata
            const processedPosts = scheduledPosts.map((post: any) => {
                const scheduledDate = new Date(post.scheduled_time);
                const isOverdue = scheduledDate < new Date() && post.status === 'pending';
                const statusEmoji: Record<string, string> = {
                    'pending': isOverdue ? '⚠️' : '⏳',
                    'published': '✅',
                    'failed': '❌',
                    'cancelled': '🚫'
                };

                return {
                    ...post,
                    is_overdue: isOverdue,
                    status_emoji: statusEmoji[post.status] || '❓',
                    content_preview: post.content.substring(0, 150) + (post.content.length > 150 ? '...' : ''),
                    scheduled_time_formatted: scheduledDate.toLocaleString(),
                    created_at_formatted: new Date(post.created_at).toLocaleDateString()
                };
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `⏰ **Your Scheduled Posts** (${count} total)`,
                        data: processedPosts,
                        total: count || 0,
                        offset,
                        limit
                    })
                }]
            };
        } catch (error) {
            console.error('Error fetching scheduled posts:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch scheduled posts: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get a specific scheduled post by ID
     */
    public getScheduledPost = async (
        { userId, scheduledPostId }: { userId: string, scheduledPostId: string }
    ): Promise<CallToolResult> => {
        try {
            const { data: post, error } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('id', scheduledPostId)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "Scheduled post not found. Please check the post ID and try again."
                        }]
                    };
                }
                throw new Error(`Failed to fetch scheduled post: ${error.message}`);
            }

            const scheduledDate = new Date(post.scheduled_time);
            const isOverdue = scheduledDate < new Date() && post.status === 'pending';
            const statusEmoji: Record<string, string> = {
                'pending': isOverdue ? '⚠️' : '⏳',
                'published': '✅',
                'failed': '❌',
                'cancelled': '🚫'
            };
            const emoji = statusEmoji[post.status] || '❓';

            return {
                content: [{
                    type: "text",
                    text: `⏰ **Scheduled Post Details**\n\nID: ${post.id}\nStatus: ${emoji} ${post.status.toUpperCase()}${isOverdue ? ' (OVERDUE)' : ''}\nType: ${post.post_type}\nScheduled for: ${scheduledDate.toLocaleString()}\nCreated: ${new Date(post.created_at).toLocaleString()}\nLast Updated: ${new Date(post.updated_at).toLocaleString()}${post.linkedin_post_id ? `\nLinkedIn Post ID: ${post.linkedin_post_id}` : ''}${post.error_message ? `\nError: ${post.error_message}` : ''}\n\n**Content:**\n${post.content}`
                }]
            };
        } catch (error) {
            console.error('Error fetching scheduled post:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch scheduled post: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Cancel a scheduled post
     */
    public cancelScheduledPost = async (
        { userId, scheduledPostId }: { userId: string, scheduledPostId: string }
    ): Promise<CallToolResult> => {
        try {
            const { data: post, error } = await supabase
                .from('scheduled_posts')
                .update({ status: 'cancelled' })
                .eq('id', scheduledPostId)
                .eq('user_id', userId)
                .eq('status', 'pending') // Only allow cancelling pending posts
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "Scheduled post not found or cannot be cancelled. Only pending posts can be cancelled."
                        }]
                    };
                }
                throw new Error(`Failed to cancel scheduled post: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `🚫 Scheduled post cancelled successfully!\n\nPost ID: ${post.id}\nOriginal schedule: ${new Date(post.scheduled_time).toLocaleString()}\nStatus: CANCELLED\n\nThe post will not be published.`
                }]
            };
        } catch (error) {
            console.error('Error cancelling scheduled post:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to cancel scheduled post: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Reschedule a pending post
     */
    public reschedulePost = async (
        { userId, scheduledPostId, newScheduledTime }: {
            userId: string,
            scheduledPostId: string,
            newScheduledTime: string
        }
    ): Promise<CallToolResult> => {
        try {
            const newDate = new Date(newScheduledTime);
            const now = new Date();

            if (newDate <= now) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "New scheduled time must be in the future"
                    }]
                };
            }

            const { data: post, error } = await supabase
                .from('scheduled_posts')
                .update({
                    scheduled_time: newDate.toISOString(),
                    status: 'pending' // Reset to pending if it was failed
                })
                .eq('id', scheduledPostId)
                .eq('user_id', userId)
                .in('status', ['pending', 'failed']) // Only allow rescheduling pending or failed posts
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "Scheduled post not found or cannot be rescheduled. Only pending or failed posts can be rescheduled."
                        }]
                    };
                }
                throw new Error(`Failed to reschedule post: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `⏰ Post rescheduled successfully!\n\nPost ID: ${post.id}\nNew schedule: ${newDate.toLocaleString()}\nStatus: PENDING\n\nThe post will be published at the new scheduled time.`
                }]
            };
        } catch (error) {
            console.error('Error rescheduling post:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to reschedule post: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}
