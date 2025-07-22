import axios from 'axios';

// Validate environment variables
const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL;
if (!MCP_SERVER_URL) {
    throw new Error('VITE_MCP_SERVER_URL environment variable is not set');
}

// MCP Client for API communication
export const createMcpClient = (token: string, onTokenExpired?: () => void) => {
    return {
        callTool: async (toolName: string, params: any) => {
            try {
                // Use longer timeout for image processing tools
                const isImageTool = toolName.includes('image') || toolName.includes('analyze');
                const timeout = isImageTool ? 60000 : 30000; // 60 seconds for image tools, 30 for others

                const response = await axios.post(`${MCP_SERVER_URL}/mcp`, {
                    type: "call-tool",
                    tool: toolName,
                    params
                }, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout
                });

                if (response.data.isError) {
                    throw new Error(response.data.content[0].text);
                }

                return response.data;
            } catch (error: any) {
                // Handle authentication errors
                if (error.response?.status === 401 || error.response?.status === 403) {
                    if (onTokenExpired) {
                        onTokenExpired();
                    }
                    throw new Error('LinkedIn connection expired. Please reconnect your LinkedIn account.');
                }

                // Check if it's an API error related to unknown tool
                if (error.response?.data?.error?.includes('Unknown tool')) {
                    throw new Error(`API tool not available: ${toolName}. Please check if the backend supports this operation.`);
                }

                // Handle network errors
                if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                    throw new Error('Network error. Please check your connection and try again.');
                }

                // Handle server errors in production
                if (error.response?.status >= 500) {
                    throw new Error('Server error. Please try again later.');
                }

                // Log error details in development only
                if (import.meta.env.DEV) {
                    console.error('MCP Service Error:', error);
                }

                throw error;
            }
        }
    };
};

// Draft Management Service
export class DraftService {
    private mcpClient: any;

    constructor(token: string, onTokenExpired?: () => void) {
        this.mcpClient = createMcpClient(token, onTokenExpired);
    }

    async saveDraft(userId: string, title: string, content: string, postType: 'basic' | 'single' | 'multiple' = 'basic', tags: string[] = []) {
        return await this.mcpClient.callTool('save-draft', {
            userId,
            title,
            content,
            postType,
            tags
        });
    }

    async getDrafts(userId: string, limit: number = 10, offset: number = 0) {
        return await this.mcpClient.callTool('get-drafts', {
            userId,
            limit,
            offset
        });
    }

    async getDraft(userId: string, draftId: string) {
        return await this.mcpClient.callTool('get-draft', {
            userId,
            draftId
        });
    }

    async updateDraft(userId: string, draftId: string, updates: {
        title?: string;
        content?: string;
        postType?: 'basic' | 'single' | 'multiple';
        tags?: string[];
    }) {
        return await this.mcpClient.callTool('update-draft', {
            userId,
            draftId,
            ...updates
        });
    }

    async deleteDraft(userId: string, draftId: string) {
        return await this.mcpClient.callTool('delete-draft', {
            userId,
            draftId
        });
    }

    async postDraft(userId: string, content: string, postType: 'basic' | 'single' | 'multiple' = 'basic') {
        // Determine which tool to use based on post type
        switch (postType) {
            case 'basic':
                return await this.mcpClient.callTool('create-post', {
                    content,
                    userId
                });

            case 'single':
                // Note: Single image posts require image data
                // Since drafts don't store images, we'll treat as basic for now
                throw new Error('Single image posts require image upload. Please use the post creator for image posts.');

            case 'multiple':
                // Note: Multiple image posts require image data
                // Since drafts don't store images, we'll treat as basic for now
                throw new Error('Multiple image posts require image upload. Please use the post creator for image posts.');

            default:
                return await this.mcpClient.callTool('create-post', {
                    content,
                    userId
                });
        }
    }
}

// Scheduling Service
export class SchedulingService {
    private mcpClient: any;

    constructor(token: string, onTokenExpired?: () => void) {
        this.mcpClient = createMcpClient(token, onTokenExpired);
    }

    async schedulePost(userId: string, content: string, scheduledTime: string, postType: 'basic' | 'single' | 'multiple' = 'basic') {
        return await this.mcpClient.callTool('schedule-post', {
            userId,
            content,
            scheduledTime,
            postType
        });
    }

    async getScheduledPosts(userId: string, status?: 'pending' | 'published' | 'failed' | 'cancelled', limit: number = 10, offset: number = 0) {
        return await this.mcpClient.callTool('get-scheduled-posts', {
            userId,
            status,
            limit,
            offset
        });
    }

    async getScheduledPost(userId: string, scheduledPostId: string) {
        return await this.mcpClient.callTool('get-scheduled-post', {
            userId,
            scheduledPostId
        });
    }

    async cancelScheduledPost(userId: string, scheduledPostId: string) {
        return await this.mcpClient.callTool('cancel-scheduled-post', {
            userId,
            scheduledPostId
        });
    }

    async reschedulePost(userId: string, scheduledPostId: string, newScheduledTime: string) {
        return await this.mcpClient.callTool('reschedule-post', {
            userId,
            scheduledPostId,
            newScheduledTime
        });
    }
}

// Analytics Service
export class AnalyticsService {
    private mcpClient: any;

    constructor(token: string, onTokenExpired?: () => void) {
        this.mcpClient = createMcpClient(token, onTokenExpired);
    }

    async getTokenAnalytics(userId: string, timeframe: '7d' | '30d' | '90d' | 'all' = '30d') {
        return await this.mcpClient.callTool('get-token-analytics', {
            userId,
            timeframe
        });
    }

    async getTokenUsageHistory(userId: string, limit: number = 20, offset: number = 0, actionType?: 'basic_post' | 'single_post' | 'multiple_post') {
        return await this.mcpClient.callTool('get-token-usage-history', {
            userId,
            limit,
            offset,
            actionType
        });
    }

    async getPostAnalytics(userId: string, timeframe: '7d' | '30d' | '90d' | 'all' = '30d') {
        return await this.mcpClient.callTool('get-post-analytics', {
            userId,
            timeframe
        });
    }
}

// Activity Service
export class ActivityService {
    private mcpClient: any;

    constructor(token: string, onTokenExpired?: () => void) {
        this.mcpClient = createMcpClient(token, onTokenExpired);
    }

    async getActivitySummary(userId: string, timeframe: '7d' | '30d' | '90d' | 'all' = '30d') {
        return await this.mcpClient.callTool('get-activity-summary', {
            userId,
            timeframe
        });
    }

    async getActivityTimeline(userId: string, limit: number = 20, offset: number = 0) {
        return await this.mcpClient.callTool('get-activity-timeline', {
            userId,
            limit,
            offset
        });
    }

    async getContentCalendar(userId: string, month?: number, year?: number) {
        return await this.mcpClient.callTool('get-content-calendar', {
            userId,
            month,
            year
        });
    }
}

// Combined service factory
export const createServices = (token: string, onTokenExpired?: () => void) => ({
    draft: new DraftService(token, onTokenExpired),
    scheduling: new SchedulingService(token, onTokenExpired),
    analytics: new AnalyticsService(token, onTokenExpired),
    activity: new ActivityService(token, onTokenExpired)
});

// Export types for TypeScript
export interface Draft {
    id: string;
    user_id: string;
    title?: string;
    content: string;
    post_type: 'basic' | 'single' | 'multiple';
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface ScheduledPost {
    id: string;
    user_id: string;
    content: string;
    post_type: 'basic' | 'single' | 'multiple';
    scheduled_time: string;
    status: 'pending' | 'published' | 'failed' | 'cancelled';
    linkedin_post_id?: string;
    error_message?: string;
    created_at: string;
    updated_at: string;
}

export interface ActivityItem {
    id: string;
    type: string;
    timestamp: string;
    data: any;
}
