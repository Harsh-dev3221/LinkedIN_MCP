import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';
import { AnalyticsService, ActivityService } from '../services/mcpService';

interface WeeklyStats {
    day: string;
    posts: number;
    engagement: number;
}

interface DashboardAnalytics {
    totalPosts: number;
    thisWeekPosts: number;
    avgEngagement: number;
    tokenStatus: any;
    weeklyUsage: any[];
    lastUpdated: string;
}

interface PostHistory {
    id: string;
    content: string;
    tokens_used: number;
    post_type: string;
    linkedin_post_id?: string;
    created_at: string;
}

// Helper function to generate mock weekly stats
const generateMockWeeklyStats = (): WeeklyStats[] => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekStats: WeeklyStats[] = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = weekDays[date.getDay()];

        weekStats.push({
            day: dayName,
            posts: Math.floor(Math.random() * 3), // 0-2 posts per day
            engagement: Math.floor(Math.random() * 20) + 75 // 75-95% engagement
        });
    }

    return weekStats;
};

export const useDashboardData = () => {
    const { user, mcpToken } = useAuth();
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [postHistory, setPostHistory] = useState<PostHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create MCP service instances
    const analyticsService = useMemo(() => {
        return mcpToken ? new AnalyticsService(mcpToken) : null;
    }, [mcpToken]);

    const activityService = useMemo(() => {
        return mcpToken ? new ActivityService(mcpToken) : null;
    }, [mcpToken]);

    const fetchWeeklyStats = useCallback(async () => {
        if (!activityService || !user?.id) return;

        try {
            const result = await activityService.getActivitySummary(user.id, '7d');

            // Parse the response text to extract weekly stats
            const responseText = result.content[0].text;

            // Try to parse as JSON first, fallback to mock data
            let weeklyData: WeeklyStats[] = [];
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.success && jsonResponse.data) {
                    // Use the new weeklyData structure from ActivityTools
                    weeklyData = jsonResponse.data.weeklyStats?.weeklyData || [];
                } else {
                    // Generate mock weekly stats if no data
                    weeklyData = generateMockWeeklyStats();
                }
            } catch {
                weeklyData = generateMockWeeklyStats();
            }

            setWeeklyStats(weeklyData);
        } catch (error) {
            console.error('Error fetching weekly stats:', error);
            setError('Failed to fetch weekly statistics');
            // Fallback to mock data on error
            setWeeklyStats(generateMockWeeklyStats());
        }
    }, [activityService, user?.id]);

    const fetchAnalytics = useCallback(async () => {
        if (!analyticsService || !user?.id) return;

        try {
            // Get token analytics and post analytics
            const [tokenResult, postResult] = await Promise.all([
                analyticsService.getTokenAnalytics(user.id, '30d'),
                analyticsService.getPostAnalytics(user.id, '30d')
            ]);

            // Parse token analytics
            const tokenText = tokenResult.content[0].text;
            let tokenData: any = {};
            try {
                const tokenJson = JSON.parse(tokenText);
                tokenData = tokenJson.success ? tokenJson.data : {};
            } catch {
                // Fallback token data
                tokenData = {
                    daily_tokens: 50,
                    tokens_used_today: 0,
                    total_tokens_used: 0
                };
            }

            // Parse post analytics
            const postText = postResult.content[0].text;
            let postData: any = {};
            try {
                const postJson = JSON.parse(postText);
                postData = postJson.success ? postJson.data : {};
            } catch {
                postData = { totalPosts: 0, thisWeekPosts: 0 };
            }

            // Combine analytics data
            const analyticsData: DashboardAnalytics = {
                totalPosts: postData.totalPosts || 0,
                thisWeekPosts: postData.thisWeekPosts || 0,
                avgEngagement: Math.floor(Math.random() * 20) + 80, // Mock engagement
                tokenStatus: tokenData,
                weeklyUsage: [],
                lastUpdated: new Date().toISOString()
            };

            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to fetch analytics data');
        }
    }, [analyticsService, user?.id]);

    const fetchPostHistory = useCallback(async (limit: number = 10) => {
        if (!analyticsService || !user?.id) return;

        try {
            const result = await analyticsService.getPostAnalytics(user.id, 'all');

            // Parse the response text to extract post history
            const responseText = result.content[0].text;

            let posts: PostHistory[] = [];
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.success && jsonResponse.data && jsonResponse.data.posts) {
                    posts = jsonResponse.data.posts.slice(0, limit);
                }
            } catch (parseError) {
                logger.error('Failed to parse post history JSON:', parseError);
                logger.error('Raw response:', responseText);
                // No posts available
                posts = [];
            }

            setPostHistory(posts);
        } catch (error) {
            console.error('Error fetching post history:', error);
            setError('Failed to fetch post history');
        }
    }, [analyticsService, user?.id]);

    const refreshAllData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            await Promise.all([
                fetchWeeklyStats(),
                fetchAnalytics(),
                fetchPostHistory()
            ]);
        } catch (error) {
            logger.error('Error refreshing dashboard data:', error);
            setError('Failed to refresh dashboard data');
        } finally {
            setLoading(false);
        }
    }, [fetchWeeklyStats, fetchAnalytics, fetchPostHistory]);

    useEffect(() => {
        if (user && mcpToken && analyticsService && activityService) {
            refreshAllData();
        }
    }, [user, mcpToken, analyticsService, activityService]); // Remove refreshAllData from dependencies to prevent infinite loop

    return {
        weeklyStats,
        analytics,
        postHistory,
        loading,
        error,
        refreshAllData,
        fetchWeeklyStats,
        fetchAnalytics,
        fetchPostHistory
    };
};
