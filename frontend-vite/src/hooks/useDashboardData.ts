import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

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

export const useDashboardData = () => {
    const { user, mcpToken } = useAuth();
    const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([]);
    const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
    const [postHistory, setPostHistory] = useState<PostHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    const fetchWeeklyStats = useCallback(async () => {
        if (!mcpToken) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/weekly-stats`, {
                headers: {
                    Authorization: `Bearer ${mcpToken}`
                },
                timeout: 10000
            });

            if (response.data.success) {
                setWeeklyStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching weekly stats:', error);
            setError('Failed to fetch weekly statistics');
        }
    }, [mcpToken, API_BASE_URL]);

    const fetchAnalytics = useCallback(async () => {
        if (!mcpToken) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/dashboard-analytics`, {
                headers: {
                    Authorization: `Bearer ${mcpToken}`
                },
                timeout: 10000
            });

            if (response.data.success) {
                setAnalytics(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setError('Failed to fetch analytics data');
        }
    }, [mcpToken, API_BASE_URL]);

    const fetchPostHistory = useCallback(async (limit: number = 10) => {
        if (!mcpToken) return;

        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/post-history?limit=${limit}`, {
                headers: {
                    Authorization: `Bearer ${mcpToken}`
                },
                timeout: 10000
            });

            if (response.data.success) {
                setPostHistory(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching post history:', error);
            setError('Failed to fetch post history');
        }
    }, [mcpToken, API_BASE_URL]);

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
        if (user && mcpToken) {
            refreshAllData();
        }
    }, [user, mcpToken]); // Remove refreshAllData from dependencies to prevent infinite loop

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
