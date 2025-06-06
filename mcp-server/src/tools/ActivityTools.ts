import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { supabase, ActivityType } from "../database/supabase.js";

export class ActivityTools {
    /**
     * Get comprehensive user activity summary
     */
    public getActivitySummary = async (
        { userId, timeframe = '30d' }: { userId: string, timeframe?: '7d' | '30d' | '90d' | 'all' }
    ): Promise<CallToolResult> => {
        try {
            // Calculate date range
            let dateFilter = '';
            const now = new Date();
            if (timeframe !== 'all') {
                const days = parseInt(timeframe.replace('d', ''));
                const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                dateFilter = startDate.toISOString();
            }

            // Get posts data
            let postsQuery = supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId);

            if (dateFilter) {
                postsQuery = postsQuery.gte('created_at', dateFilter);
            }

            const { data: posts, error: postsError } = await postsQuery;

            // Get drafts data
            let draftsQuery = supabase
                .from('drafts')
                .select('*')
                .eq('user_id', userId);

            if (dateFilter) {
                draftsQuery = draftsQuery.gte('created_at', dateFilter);
            }

            const { data: drafts, error: draftsError } = await draftsQuery;

            // Get scheduled posts data
            let scheduledQuery = supabase
                .from('scheduled_posts')
                .select('*')
                .eq('user_id', userId);

            if (dateFilter) {
                scheduledQuery = scheduledQuery.gte('created_at', dateFilter);
            }

            const { data: scheduledPosts, error: scheduledError } = await scheduledQuery;

            // Get token usage data
            let tokenQuery = supabase
                .from('token_usage_history')
                .select('*')
                .eq('user_id', userId);

            if (dateFilter) {
                tokenQuery = tokenQuery.gte('timestamp', dateFilter);
            }

            const { data: tokenUsage, error: tokenError } = await tokenQuery;

            if (postsError || draftsError || scheduledError || tokenError) {
                throw new Error('Failed to fetch activity data');
            }

            // Calculate statistics
            const stats = this.calculateActivityStats(
                posts || [],
                drafts || [],
                scheduledPosts || [],
                tokenUsage || [],
                timeframe
            );

            // Return structured JSON data
            const activityData = {
                success: true,
                data: {
                    timeframe: timeframe,
                    timeframeText: stats.timeframeText,
                    totalPosts: stats.totalPosts,
                    postsByType: stats.postsByType,
                    totalDrafts: stats.totalDrafts,
                    totalScheduled: stats.totalScheduled,
                    scheduledByStatus: stats.scheduledByStatus,
                    totalTokensUsed: stats.totalTokensUsed,
                    avgTokensPerAction: stats.avgTokensPerAction,
                    totalActivities: stats.totalActivities,
                    avgActivitiesPerDay: stats.avgActivitiesPerDay,
                    weeklyStats: this.generateWeeklyStats(posts || [], timeframe)
                }
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(activityData)
                }]
            };

        } catch (error) {
            console.error('Error fetching activity summary:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch activity summary: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get chronological activity timeline
     */
    public getActivityTimeline = async (
        { userId, limit = 20, offset = 0 }: { userId: string, limit?: number, offset?: number }
    ): Promise<CallToolResult> => {
        try {
            // Get all activities and combine them
            const activities: any[] = [];

            // Get posts
            const { data: posts } = await supabase
                .from('posts')
                .select('id, content, post_type, tokens_used, created_at, linkedin_post_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50); // Get more to mix with other activities

            posts?.forEach((post: any) => {
                activities.push({
                    type: 'post_published',
                    id: post.id,
                    timestamp: post.created_at,
                    data: post
                });
            });

            // Get drafts
            const { data: drafts } = await supabase
                .from('drafts')
                .select('id, title, content, post_type, created_at, updated_at')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(50);

            drafts?.forEach((draft: any) => {
                activities.push({
                    type: 'draft_created',
                    id: draft.id,
                    timestamp: draft.created_at,
                    data: draft
                });

                // Add update activity if different from creation
                if (new Date(draft.updated_at).getTime() !== new Date(draft.created_at).getTime()) {
                    activities.push({
                        type: 'draft_updated',
                        id: draft.id,
                        timestamp: draft.updated_at,
                        data: draft
                    });
                }
            });

            // Get scheduled posts
            const { data: scheduledPosts } = await supabase
                .from('scheduled_posts')
                .select('id, content, post_type, status, scheduled_time, created_at, updated_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            scheduledPosts?.forEach((scheduled: any) => {
                activities.push({
                    type: 'post_scheduled',
                    id: scheduled.id,
                    timestamp: scheduled.created_at,
                    data: scheduled
                });

                if (scheduled.status === 'published') {
                    activities.push({
                        type: 'scheduled_post_published',
                        id: scheduled.id,
                        timestamp: scheduled.updated_at,
                        data: scheduled
                    });
                } else if (scheduled.status === 'cancelled') {
                    activities.push({
                        type: 'scheduled_post_cancelled',
                        id: scheduled.id,
                        timestamp: scheduled.updated_at,
                        data: scheduled
                    });
                }
            });

            // Sort all activities by timestamp (newest first)
            activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            // Apply pagination
            const paginatedActivities = activities.slice(offset, offset + limit);

            if (paginatedActivities.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "📅 No activity found. Start creating posts, drafts, or scheduling content to see your timeline!"
                    }]
                };
            }

            const timeline = paginatedActivities.map((activity, index) => {
                return this.formatActivityItem(activity, offset + index + 1);
            }).join('\n\n');

            return {
                content: [{
                    type: "text",
                    text: `📅 **Activity Timeline** (${activities.length} total activities)\n\n${timeline}\n\n💡 Use pagination to view more activities.`
                }]
            };

        } catch (error) {
            console.error('Error fetching activity timeline:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch activity timeline: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get user's content calendar view
     */
    public getContentCalendar = async (
        { userId, month, year }: { userId: string, month?: number, year?: number }
    ): Promise<CallToolResult> => {
        try {
            const now = new Date();
            const targetMonth = month || (now.getMonth() + 1);
            const targetYear = year || now.getFullYear();

            // Calculate month boundaries
            const startDate = new Date(targetYear, targetMonth - 1, 1);
            const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

            // Get all content for the month
            const { data: posts } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString());

            const { data: scheduledPosts } = await supabase
                .from('scheduled_posts')
                .select('*')
                .eq('user_id', userId)
                .gte('scheduled_time', startDate.toISOString())
                .lte('scheduled_time', endDate.toISOString());

            // Organize by date
            const calendar = this.buildCalendarView(
                posts || [],
                scheduledPosts || [],
                targetMonth,
                targetYear
            );

            return {
                content: [{
                    type: "text",
                    text: calendar
                }]
            };

        } catch (error) {
            console.error('Error fetching content calendar:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch content calendar: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Calculate activity statistics
     */
    private calculateActivityStats(posts: any[], drafts: any[], scheduledPosts: any[], tokenUsage: any[], timeframe: string) {
        const timeframeText = timeframe === 'all' ? 'All Time' : `Last ${timeframe}`;

        // Posts stats
        const totalPosts = posts.length;
        const postsByType = posts.reduce((acc, post) => {
            acc[post.post_type] = (acc[post.post_type] || 0) + 1;
            return acc;
        }, {});

        // Drafts stats
        const totalDrafts = drafts.length;
        const activeDrafts = drafts.length; // All drafts are considered active

        // Scheduled posts stats
        const totalScheduled = scheduledPosts.length;
        const scheduledByStatus = scheduledPosts.reduce((acc, post) => {
            acc[post.status] = (acc[post.status] || 0) + 1;
            return acc;
        }, {});

        // Token usage stats
        const totalTokensUsed = tokenUsage.reduce((sum, usage) => sum + usage.tokens_consumed, 0);
        const avgTokensPerAction = totalTokensUsed > 0 ? Math.round(totalTokensUsed / tokenUsage.length) : 0;

        // Activity frequency
        const totalActivities = totalPosts + totalDrafts + totalScheduled;
        const daysInTimeframe = timeframe === 'all' ? 365 : parseInt(timeframe.replace('d', ''));
        const avgActivitiesPerDay = Math.round((totalActivities / daysInTimeframe) * 10) / 10;

        return {
            timeframeText,
            totalPosts,
            postsByType,
            totalDrafts,
            activeDrafts,
            totalScheduled,
            scheduledByStatus,
            totalTokensUsed,
            avgTokensPerAction,
            totalActivities,
            avgActivitiesPerDay
        };
    }

    /**
     * Generate weekly statistics for dashboard
     */
    private generateWeeklyStats(posts: any[], timeframe: string) {
        const oneWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
        const thisWeekPosts = posts.filter(post =>
            new Date(post.created_at) >= oneWeekAgo
        );

        // Generate daily stats for the week
        const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const weeklyData = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dayName = weekDays[date.getDay()];

            const dayPosts = posts.filter(post => {
                const postDate = new Date(post.created_at);
                return postDate.toDateString() === date.toDateString();
            });

            weeklyData.push({
                day: dayName,
                posts: dayPosts.length,
                engagement: Math.floor(Math.random() * 20) + 80 // Mock engagement for now
            });
        }

        return {
            thisWeekPosts: thisWeekPosts.length,
            weeklyData: weeklyData,
            recentActivity: posts.slice(0, 5).map(post => ({
                type: 'post_published',
                content: post.content.substring(0, 80) + (post.content.length > 80 ? '...' : ''),
                date: post.created_at,
                tokens_used: post.tokens_used
            }))
        };
    }

    /**
     * Format activity summary
     */
    private formatActivitySummary(stats: any): string {
        const postTypeBreakdown = Object.entries(stats.postsByType)
            .map(([type, count]) => `   ${type}: ${count}`)
            .join('\n') || '   None';

        const scheduledStatusBreakdown = Object.entries(stats.scheduledByStatus)
            .map(([status, count]) => `   ${status}: ${count}`)
            .join('\n') || '   None';

        return `🎯 **Activity Summary** (${stats.timeframeText})

**📊 Overview:**
🚀 Total Activities: ${stats.totalActivities}
📈 Avg Activities/Day: ${stats.avgActivitiesPerDay}
⚡ Total Tokens Used: ${stats.totalTokensUsed}
🎯 Avg Tokens/Action: ${stats.avgTokensPerAction}

**📝 Posts Published: ${stats.totalPosts}**
${postTypeBreakdown}

**📋 Drafts Created: ${stats.totalDrafts}**
💾 Active Drafts: ${stats.activeDrafts}

**⏰ Posts Scheduled: ${stats.totalScheduled}**
${scheduledStatusBreakdown}

💡 Keep up the great work! Your content creation is on track.`;
    }

    /**
     * Format individual activity item
     */
    private formatActivityItem(activity: any, index: number): string {
        const date = new Date(activity.timestamp).toLocaleString();
        const preview = activity.data.content ?
            activity.data.content.substring(0, 80) + (activity.data.content.length > 80 ? '...' : '') : '';

        const activityEmojis: Record<string, string> = {
            'post_published': '✅',
            'draft_created': '📝',
            'draft_updated': '✏️',
            'post_scheduled': '⏰',
            'scheduled_post_published': '🚀',
            'scheduled_post_cancelled': '🚫'
        };

        const activityNames: Record<string, string> = {
            'post_published': 'Post Published',
            'draft_created': 'Draft Created',
            'draft_updated': 'Draft Updated',
            'post_scheduled': 'Post Scheduled',
            'scheduled_post_published': 'Scheduled Post Published',
            'scheduled_post_cancelled': 'Scheduled Post Cancelled'
        };

        const emoji = activityEmojis[activity.type] || '📊';
        const name = activityNames[activity.type] || activity.type;

        let details = '';
        if (activity.data.post_type) {
            details += `\n   Type: ${activity.data.post_type}`;
        }
        if (activity.data.tokens_used) {
            details += `\n   Tokens: ${activity.data.tokens_used}`;
        }
        if (activity.data.scheduled_time && activity.type === 'post_scheduled') {
            details += `\n   Scheduled for: ${new Date(activity.data.scheduled_time).toLocaleString()}`;
        }

        return `${index}. ${emoji} **${name}**
   Date: ${date}
   ID: ${activity.data.id}${details}${preview ? `\n   Preview: ${preview}` : ''}`;
    }

    /**
     * Build calendar view for a month
     */
    private buildCalendarView(posts: any[], scheduledPosts: any[], month: number, year: number): string {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        const daysInMonth = new Date(year, month, 0).getDate();
        const calendar: Record<number, any[]> = {};

        // Organize posts by day
        posts.forEach(post => {
            const day = new Date(post.created_at).getDate();
            if (!calendar[day]) calendar[day] = [];
            calendar[day].push({ type: 'published', data: post });
        });

        // Organize scheduled posts by day
        scheduledPosts.forEach(post => {
            const day = new Date(post.scheduled_time).getDate();
            if (!calendar[day]) calendar[day] = [];
            calendar[day].push({ type: 'scheduled', data: post });
        });

        let calendarText = `📅 **Content Calendar - ${monthNames[month - 1]} ${year}**\n\n`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayActivities = calendar[day];
            if (dayActivities && dayActivities.length > 0) {
                calendarText += `**Day ${day}:**\n`;
                dayActivities.forEach(activity => {
                    const emoji = activity.type === 'published' ? '✅' : '⏰';
                    const status = activity.type === 'published' ? 'Published' : `Scheduled (${activity.data.status})`;
                    const preview = activity.data.content.substring(0, 60);
                    calendarText += `   ${emoji} ${status}: ${preview}${activity.data.content.length > 60 ? '...' : ''}\n`;
                });
                calendarText += '\n';
            }
        }

        if (Object.keys(calendar).length === 0) {
            calendarText += '📭 No content scheduled or published this month.\n\n💡 Start planning your content calendar!';
        }

        return calendarText;
    }
}
