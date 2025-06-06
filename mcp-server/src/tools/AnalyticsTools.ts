import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { supabase, ActionType } from "../database/supabase.js";

export class AnalyticsTools {
    /**
     * Get comprehensive token usage analytics
     */
    public getTokenAnalytics = async (
        { userId, timeframe = '30d' }: { userId: string, timeframe?: '7d' | '30d' | '90d' | 'all' }
    ): Promise<CallToolResult> => {
        try {
            // Calculate date range
            let dateFilter = '';
            const now = new Date();
            if (timeframe !== 'all') {
                const days = parseInt(timeframe.replace('d', ''));
                const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
                dateFilter = `AND timestamp >= '${startDate.toISOString()}'`;
            }

            // Get current token status
            const { data: tokenStatus, error: tokenError } = await supabase
                .from('user_tokens')
                .select('daily_tokens, tokens_used_today, total_tokens_used, last_refresh_date')
                .eq('user_id', userId)
                .single();

            if (tokenError) {
                throw new Error(`Failed to fetch token status: ${tokenError.message}`);
            }

            // Get usage statistics for the timeframe
            const { data: usageStats, error: usageError } = await supabase
                .rpc('get_token_usage_stats', {
                    p_user_id: userId,
                    p_timeframe: timeframe
                });

            if (usageError) {
                // Fallback to manual query if RPC doesn't exist

                const { data: fallbackStats, error: fallbackError } = await supabase
                    .from('token_usage_history')
                    .select('action_type, tokens_consumed, timestamp')
                    .eq('user_id', userId);

                if (fallbackError) {
                    throw new Error(`Failed to fetch usage statistics: ${fallbackError.message}`);
                }

                // Process fallback data
                const stats = this.processUsageData(fallbackStats || [], timeframe);
                return this.formatAnalyticsResponse(tokenStatus, stats, timeframe);
            }

            return this.formatAnalyticsResponse(tokenStatus, usageStats || [], timeframe);

        } catch (error) {
            console.error('Error fetching token analytics:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch token analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get detailed token usage history
     */
    public getTokenUsageHistory = async (
        { userId, limit = 20, offset = 0, actionType }: {
            userId: string,
            limit?: number,
            offset?: number,
            actionType?: 'basic_post' | 'single_post' | 'multiple_post'
        }
    ): Promise<CallToolResult> => {
        try {
            let query = supabase
                .from('token_usage_history')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('timestamp', { ascending: false });

            if (actionType) {
                query = query.eq('action_type', actionType);
            }

            const { data: history, error, count } = await query
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Failed to fetch token usage history: ${error.message}`);
            }

            if (!history || history.length === 0) {
                const actionText = actionType ? ` for ${actionType}` : '';
                return {
                    content: [{
                        type: "text",
                        text: `📊 No token usage history found${actionText}. Start creating posts to see your usage history!`
                    }]
                };
            }

            const historyList = history.map((entry: any, index: number) => {
                const actionEmoji: Record<string, string> = {
                    'basic_post': '📝',
                    'single_post': '🖼️',
                    'multiple_post': '🎠'
                };
                const emoji = actionEmoji[entry.action_type] || '📊';

                const contentPreview = entry.post_content
                    ? `\n   Content: ${entry.post_content.substring(0, 100)}${entry.post_content.length > 100 ? '...' : ''}`
                    : '';

                return `${offset + index + 1}. ${emoji} **${entry.action_type.replace('_', ' ').toUpperCase()}**
   Tokens Used: ${entry.tokens_consumed}
   Date: ${new Date(entry.timestamp).toLocaleString()}${contentPreview}`;
            }).join('\n\n');

            const totalTokensUsed = history.reduce((sum, entry) => sum + entry.tokens_consumed, 0);

            return {
                content: [{
                    type: "text",
                    text: `📊 **Token Usage History** (${count} total entries)\n\n${historyList}\n\n**Summary for this page:**\nTotal tokens used: ${totalTokensUsed}\nEntries shown: ${history.length}\n\n💡 Use pagination to view more entries.`
                }]
            };
        } catch (error) {
            console.error('Error fetching token usage history:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch token usage history: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get post performance analytics
     */
    public getPostAnalytics = async (
        { userId, timeframe = '30d' }: { userId: string, timeframe?: '7d' | '30d' | '90d' | 'all' }
    ): Promise<CallToolResult> => {
        try {
            // Calculate date range
            let query = supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId);

            if (timeframe !== 'all') {
                const days = parseInt(timeframe.replace('d', ''));
                const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
                query = query.gte('created_at', startDate.toISOString());
            }

            const { data: posts, error } = await query.order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch post analytics: ${error.message}`);
            }

            if (!posts || posts.length === 0) {
                // Return structured JSON for empty data
                const emptyData = {
                    success: true,
                    data: {
                        totalPosts: 0,
                        thisWeekPosts: 0,
                        postsByType: {},
                        totalTokensUsed: 0,
                        avgTokensPerPost: 0,
                        posts: [],
                        timeframe: timeframe
                    }
                };

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(emptyData)
                    }]
                };
            }

            // Calculate statistics
            const totalPosts = posts.length;
            const postsByType = posts.reduce((acc, post) => {
                acc[post.post_type] = (acc[post.post_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const totalTokensUsed = posts.reduce((sum, post) => sum + post.tokens_used, 0);
            const avgTokensPerPost = Math.round(totalTokensUsed / totalPosts);

            // Posts by day
            const postsByDay = posts.reduce((acc, post) => {
                const date = new Date(post.created_at).toDateString();
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const mostActiveDay = Object.entries(postsByDay)
                .sort(([, a], [, b]) => (b as number) - (a as number))[0];

            // Calculate this week's posts
            const oneWeekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
            const thisWeekPosts = posts.filter(post =>
                new Date(post.created_at) >= oneWeekAgo
            ).length;

            // Format posts for frontend
            const formattedPosts = posts.slice(0, 10).map(post => ({
                id: post.id,
                content: post.content.substring(0, 100) + (post.content.length > 100 ? '...' : ''),
                post_type: post.post_type,
                tokens_used: post.tokens_used,
                created_at: post.created_at,
                linkedin_post_id: post.linkedin_post_id
            }));

            // Return structured JSON data
            const analyticsData = {
                success: true,
                data: {
                    totalPosts,
                    thisWeekPosts,
                    postsByType,
                    totalTokensUsed,
                    avgTokensPerPost,
                    mostActiveDay: mostActiveDay ? { date: mostActiveDay[0], count: mostActiveDay[1] } : null,
                    posts: formattedPosts,
                    timeframe: timeframe
                }
            };

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(analyticsData)
                }]
            };
        } catch (error) {
            console.error('Error fetching post analytics:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch post analytics: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Process usage data for analytics (fallback method)
     */
    private processUsageData(data: any[], timeframe: string) {
        const now = new Date();
        let startDate = new Date(0); // Beginning of time for 'all'

        if (timeframe !== 'all') {
            const days = parseInt(timeframe.replace('d', ''));
            startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
        }

        const filteredData = data.filter(entry =>
            new Date(entry.timestamp) >= startDate
        );

        const stats = filteredData.reduce((acc, entry) => {
            const type = entry.action_type;
            if (!acc[type]) {
                acc[type] = { count: 0, total_tokens: 0 };
            }
            acc[type].count++;
            acc[type].total_tokens += entry.tokens_consumed;
            return acc;
        }, {} as Record<string, { count: number, total_tokens: number }>);

        return Object.entries(stats).map(([action_type, data]) => ({
            action_type,
            usage_count: (data as any).count,
            total_tokens: (data as any).total_tokens,
            avg_tokens: Math.round((data as any).total_tokens / (data as any).count)
        }));
    }

    /**
     * Format analytics response
     */
    private formatAnalyticsResponse(tokenStatus: any, usageStats: any[], timeframe: string): CallToolResult {
        const timeframeText = timeframe === 'all' ? 'All Time' : `Last ${timeframe}`;

        const currentStatus = `**Current Token Status:**\n💰 Daily Allowance: ${tokenStatus.daily_tokens}\n⚡ Used Today: ${tokenStatus.tokens_used_today}\n🔋 Remaining Today: ${tokenStatus.daily_tokens - tokenStatus.tokens_used_today}\n📊 Total Used: ${tokenStatus.total_tokens_used}\n🗓️ Last Refresh: ${new Date(tokenStatus.last_refresh_date).toLocaleDateString()}`;

        // Calculate totals
        const totalUsage = usageStats.reduce((sum, stat) => sum + (stat.total_tokens || 0), 0);

        // Return structured JSON data
        const analyticsData = {
            success: true,
            data: {
                daily_tokens: tokenStatus.daily_tokens,
                tokens_used_today: tokenStatus.tokens_used_today,
                remaining_today: tokenStatus.daily_tokens - tokenStatus.tokens_used_today,
                total_tokens_used: tokenStatus.total_tokens_used,
                last_refresh_date: tokenStatus.last_refresh_date,
                timeframe: timeframe,
                timeframeText: timeframeText,
                totalUsageInTimeframe: totalUsage,
                usageStats: usageStats
            }
        };

        return {
            content: [{
                type: "text",
                text: JSON.stringify(analyticsData)
            }]
        };
    }
}
