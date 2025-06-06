import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SchedulingService, ScheduledPost } from '../services/mcpService';

export const useScheduledPosts = () => {
    const { user, mcpToken } = useAuth();
    const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<number>(0);
    const schedulingServiceRef = useRef<SchedulingService | null>(null);

    // Create service instance only when needed and cache it
    useEffect(() => {
        if (mcpToken && !schedulingServiceRef.current) {
            schedulingServiceRef.current = new SchedulingService(mcpToken);
        } else if (!mcpToken) {
            schedulingServiceRef.current = null;
        }
    }, [mcpToken]);

    const fetchScheduledPosts = useCallback(async (status?: 'pending' | 'published' | 'failed' | 'cancelled', force = false) => {
        if (!schedulingServiceRef.current || !user?.id) return;

        // Prevent frequent refetches (cache for 30 seconds)
        const now = Date.now();
        if (!force && now - lastFetch < 30000) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await schedulingServiceRef.current.getScheduledPosts(user.id, status);

            // Parse the response text to extract scheduled posts data
            const responseText = result.content[0].text;

            // Try to parse as JSON first, fallback to text parsing
            let posts: any[] = [];
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.success && jsonResponse.data) {
                    posts = jsonResponse.data;
                } else {
                    posts = parseScheduledPostsResponse(responseText);
                }
            } catch {
                posts = parseScheduledPostsResponse(responseText);
            }

            setScheduledPosts(posts);
            setLastFetch(now);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch scheduled posts');
        } finally {
            setLoading(false);
        }
    }, [user?.id, lastFetch]);

    const schedulePost = useCallback(async (content: string, scheduledTime: string, postType: 'basic' | 'single' | 'multiple' = 'basic') => {
        if (!schedulingServiceRef.current || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await schedulingServiceRef.current.schedulePost(user.id, content, scheduledTime, postType);

        // Refresh the list after scheduling
        await fetchScheduledPosts(undefined, true);

        return result;
    }, [user?.id]); // Remove fetchScheduledPosts from dependencies

    const cancelScheduledPost = useCallback(async (scheduledPostId: string) => {
        if (!schedulingServiceRef.current || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await schedulingServiceRef.current.cancelScheduledPost(user.id, scheduledPostId);

        // Refresh the list after cancelling
        await fetchScheduledPosts(undefined, true);

        return result;
    }, [user?.id]); // Remove fetchScheduledPosts from dependencies

    const reschedulePost = useCallback(async (scheduledPostId: string, newScheduledTime: string) => {
        if (!schedulingServiceRef.current || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await schedulingServiceRef.current.reschedulePost(user.id, scheduledPostId, newScheduledTime);

        // Refresh the list after rescheduling
        await fetchScheduledPosts(undefined, true);

        return result;
    }, [user?.id]); // Remove fetchScheduledPosts from dependencies

    // Auto-fetch on mount only once
    useEffect(() => {
        if (user?.id && schedulingServiceRef.current && scheduledPosts.length === 0 && !loading) {
            fetchScheduledPosts();
        }
    }, [user?.id]); // Only depend on user.id, not fetchScheduledPosts

    return {
        scheduledPosts,
        loading,
        error,
        fetchScheduledPosts,
        schedulePost,
        cancelScheduledPost,
        reschedulePost,
        refresh: fetchScheduledPosts
    };
};

// Hook for getting pending scheduled posts for dashboard
export const usePendingScheduledPosts = () => {
    const { user, mcpToken } = useAuth();
    const [pendingPosts, setPendingPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetch, setLastFetch] = useState<number>(0);
    const schedulingServiceRef = useRef<SchedulingService | null>(null);

    // Create service instance only when needed and cache it
    useEffect(() => {
        if (mcpToken && !schedulingServiceRef.current) {
            schedulingServiceRef.current = new SchedulingService(mcpToken);
        } else if (!mcpToken) {
            schedulingServiceRef.current = null;
        }
    }, [mcpToken]);

    const fetchPendingPosts = useCallback(async (force = false) => {
        if (!schedulingServiceRef.current || !user?.id) return;

        // Prevent frequent refetches (cache for 30 seconds)
        const now = Date.now();
        if (!force && now - lastFetch < 30000) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await schedulingServiceRef.current.getScheduledPosts(user.id, 'pending', 5); // Get top 5 pending posts

            // Parse the response to extract pending posts
            const responseText = result.content[0].text;

            // Try to parse as JSON first, fallback to text parsing
            let posts: any[] = [];
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.success && jsonResponse.data) {
                    posts = jsonResponse.data;
                } else {
                    posts = parseScheduledPostsResponse(responseText);
                }
            } catch {
                posts = parseScheduledPostsResponse(responseText);
            }

            setPendingPosts(posts);
            setLastFetch(now);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch pending posts');
            setPendingPosts([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id, lastFetch]);

    // Auto-fetch on mount only once
    useEffect(() => {
        if (user?.id && schedulingServiceRef.current && pendingPosts.length === 0 && !loading) {
            fetchPendingPosts();
        }
    }, [user?.id]); // Only depend on user.id, not fetchPendingPosts

    return {
        pendingPosts,
        loading,
        error,
        refresh: fetchPendingPosts
    };
};

// Helper function to parse scheduled posts response
const parseScheduledPostsResponse = (responseText: string): any[] => {
    const posts: any[] = [];

    try {
        // Check if response indicates no posts
        if (responseText.includes('No scheduled posts found')) {
            return [];
        }

        // Look for post entries in the response
        const lines = responseText.split('\n');
        let currentPost: any = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Look for numbered post entries (e.g., "1. ⏳ **PENDING**")
            const postMatch = trimmedLine.match(/^(\d+)\.\s*([⏳✅❌🚫⚠️])\s*\*\*(\w+)\*\*/);
            if (postMatch) {
                if (currentPost) {
                    posts.push(currentPost);
                }
                currentPost = {
                    status: postMatch[3].toLowerCase(),
                    emoji: postMatch[2]
                };
                continue;
            }

            if (!currentPost) continue;

            // Look for post ID pattern
            const idMatch = trimmedLine.match(/ID:\s*([a-f0-9-]+)/i);
            if (idMatch) {
                currentPost.id = idMatch[1];
                continue;
            }

            // Look for post type
            const typeMatch = trimmedLine.match(/Type:\s*(\w+)/i);
            if (typeMatch) {
                currentPost.post_type = typeMatch[1];
                continue;
            }

            // Look for scheduled time
            const timeMatch = trimmedLine.match(/Scheduled:\s*(.+?)(?:\s*\(OVERDUE\))?$/i);
            if (timeMatch) {
                currentPost.scheduled_time = timeMatch[1].trim();
                if (trimmedLine.includes('(OVERDUE)')) {
                    currentPost.is_overdue = true;
                }
                continue;
            }

            // Look for created date
            const createdMatch = trimmedLine.match(/Created:\s*(.+)/i);
            if (createdMatch) {
                currentPost.created_at = createdMatch[1];
                continue;
            }

            // Look for content preview
            const previewMatch = trimmedLine.match(/Preview:\s*(.+)/i);
            if (previewMatch) {
                currentPost.content = previewMatch[1];
                continue;
            }

            // Look for error message
            const errorMatch = trimmedLine.match(/Error:\s*(.+)/i);
            if (errorMatch) {
                currentPost.error_message = errorMatch[1];
                continue;
            }
        }

        // Add the last post if exists
        if (currentPost) {
            posts.push(currentPost);
        }

    } catch (error) {
        console.error('Error parsing scheduled posts response:', error);
    }

    return posts;
};
