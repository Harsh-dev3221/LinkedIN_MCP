import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "../database/supabase.js";

export class OverdueManagementTools {
    /**
     * Get overdue posts analysis for a user
     */
    public getOverdueAnalysis = async (
        { userId }: { userId: string }
    ): Promise<CallToolResult> => {
        try {
            // Get all pending posts for the user
            const { data: posts, error } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .order('scheduled_time', { ascending: true });

            if (error) {
                throw new Error(`Failed to fetch posts: ${error.message}`);
            }

            if (!posts || posts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "✅ No pending scheduled posts found. All posts are up to date!"
                    }]
                };
            }

            const now = new Date();
            const analysis = {
                total: posts.length,
                onTime: 0,
                recentlyOverdue: 0,
                moderatelyOverdue: 0,
                severelyOverdue: 0,
                criticallyOverdue: 0,
                details: [] as any[]
            };

            posts.forEach(post => {
                const scheduledTime = new Date(post.scheduled_time);
                const overdueMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
                
                let category = '';
                let status = '';
                let action = '';

                if (overdueMinutes <= 5) {
                    analysis.onTime++;
                    category = 'On Time';
                    status = '✅';
                    action = 'Will publish automatically';
                } else if (overdueMinutes <= 60) {
                    analysis.recentlyOverdue++;
                    category = 'Recently Overdue';
                    status = '⏰';
                    action = 'Publishing with minor delay';
                } else if (overdueMinutes <= 24 * 60) {
                    analysis.moderatelyOverdue++;
                    category = 'Moderately Overdue';
                    status = '⚠️';
                    action = 'Publishing with overdue notice';
                } else if (overdueMinutes <= 7 * 24 * 60) {
                    analysis.severelyOverdue++;
                    category = 'Severely Overdue';
                    status = '🚨';
                    action = 'Attempting to publish with warning';
                } else {
                    analysis.criticallyOverdue++;
                    category = 'Critically Overdue';
                    status = '💀';
                    action = 'Will be marked as failed';
                }

                analysis.details.push({
                    id: post.id,
                    content: post.content.substring(0, 50) + '...',
                    scheduled: scheduledTime.toLocaleString(),
                    category,
                    status,
                    action,
                    overdueTime: this.getOverdueTime(post.scheduled_time)
                });
            });

            const summary = `📊 **Scheduled Posts Analysis**

**Summary:**
• Total pending posts: ${analysis.total}
• ✅ On time: ${analysis.onTime}
• ⏰ Recently overdue (5min-1hr): ${analysis.recentlyOverdue}
• ⚠️ Moderately overdue (1-24hr): ${analysis.moderatelyOverdue}
• 🚨 Severely overdue (1-7 days): ${analysis.severelyOverdue}
• 💀 Critically overdue (>7 days): ${analysis.criticallyOverdue}

**Post Details:**
${analysis.details.map((post, index) => 
    `${index + 1}. ${post.status} **${post.category}**
   ID: ${post.id}
   Content: ${post.content}
   Scheduled: ${post.scheduled}
   Status: ${post.overdueTime || 'Due now'}
   Action: ${post.action}`
).join('\n\n')}

**Automatic Actions:**
• On-time posts: Published immediately
• Recently overdue: Published without warning
• Moderately overdue: Published with delay notice
• Severely overdue: Published with warning or marked failed
• Critically overdue: Automatically marked as failed

💡 Use 'reschedule-overdue-posts' to reschedule all overdue posts to future times.`;

            return {
                content: [{
                    type: "text",
                    text: summary
                }]
            };

        } catch (error) {
            console.error('Error in overdue analysis:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to analyze overdue posts: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Reschedule all overdue posts to future times
     */
    public rescheduleOverduePosts = async (
        { userId, hoursFromNow = 1 }: { userId: string, hoursFromNow?: number }
    ): Promise<CallToolResult> => {
        try {
            const now = new Date();
            
            // Get all overdue pending posts
            const { data: overduePosts, error } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .lt('scheduled_time', now.toISOString());

            if (error) {
                throw new Error(`Failed to fetch overdue posts: ${error.message}`);
            }

            if (!overduePosts || overduePosts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "✅ No overdue posts found to reschedule!"
                    }]
                };
            }

            // Reschedule each post
            const rescheduledPosts = [];
            for (let i = 0; i < overduePosts.length; i++) {
                const post = overduePosts[i];
                const newTime = new Date(now.getTime() + (hoursFromNow + i * 0.5) * 60 * 60 * 1000); // Space them 30 minutes apart
                
                const { error: updateError } = await supabase
                    .from('scheduled_posts')
                    .update({
                        scheduled_time: newTime.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', post.id);

                if (!updateError) {
                    rescheduledPosts.push({
                        id: post.id,
                        content: post.content.substring(0, 50) + '...',
                        oldTime: new Date(post.scheduled_time).toLocaleString(),
                        newTime: newTime.toLocaleString()
                    });
                }
            }

            const summary = `✅ **Rescheduled ${rescheduledPosts.length} Overdue Posts**

${rescheduledPosts.map((post, index) => 
    `${index + 1}. ID: ${post.id}
   Content: ${post.content}
   Old time: ${post.oldTime}
   New time: ${post.newTime}`
).join('\n\n')}

💡 Posts are now scheduled starting ${hoursFromNow} hour${hoursFromNow > 1 ? 's' : ''} from now, spaced 30 minutes apart.`;

            return {
                content: [{
                    type: "text",
                    text: summary
                }]
            };

        } catch (error) {
            console.error('Error rescheduling overdue posts:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to reschedule overdue posts: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Mark all critically overdue posts as failed
     */
    public markCriticallyOverdueAsFailed = async (
        { userId }: { userId: string }
    ): Promise<CallToolResult> => {
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            // Get critically overdue posts (>7 days)
            const { data: criticalPosts, error } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending')
                .lt('scheduled_time', sevenDaysAgo.toISOString());

            if (error) {
                throw new Error(`Failed to fetch critical posts: ${error.message}`);
            }

            if (!criticalPosts || criticalPosts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "✅ No critically overdue posts found!"
                    }]
                };
            }

            // Mark as failed
            const { error: updateError } = await supabase
                .from('scheduled_posts')
                .update({
                    status: 'failed',
                    error_message: 'Marked as failed due to being critically overdue (>7 days)',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('status', 'pending')
                .lt('scheduled_time', sevenDaysAgo.toISOString());

            if (updateError) {
                throw new Error(`Failed to update posts: ${updateError.message}`);
            }

            const summary = `🚨 **Marked ${criticalPosts.length} Critically Overdue Posts as Failed**

${criticalPosts.map((post, index) => 
    `${index + 1}. ID: ${post.id}
   Content: ${post.content.substring(0, 50)}...
   Originally scheduled: ${new Date(post.scheduled_time).toLocaleString()}
   Overdue by: ${this.getOverdueTime(post.scheduled_time)}`
).join('\n\n')}

💡 These posts were too old to be relevant. You can reschedule them manually if still needed.`;

            return {
                content: [{
                    type: "text",
                    text: summary
                }]
            };

        } catch (error) {
            console.error('Error marking critical posts as failed:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to mark critical posts as failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

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
}
