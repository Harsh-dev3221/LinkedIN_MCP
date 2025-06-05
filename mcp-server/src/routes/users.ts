import { Router, Request, Response } from 'express';
import { UserService } from '../services/UserService.js';
import { authMiddleware } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const userService = new UserService();

// Validation schemas
const createUserSchema = z.object({
    email: z.string().email(),
    name: z.string().optional(),
    avatar_url: z.string().url().optional(),
    provider: z.enum(['google', 'linkedin']),
    provider_id: z.string()
});

/**
 * POST /api/users - Create or get user
 * This endpoint is called after successful OAuth authentication
 * NO AUTH REQUIRED - This is for creating new users
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        console.log('POST /api/users - Creating/getting user');
        console.log('Request body:', req.body);

        const validatedData = createUserSchema.parse(req.body);
        console.log('Validated data:', validatedData);

        const user = await userService.createOrGetUser(validatedData);
        console.log('User created/retrieved:', user.email);

        const responseData = {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
                provider: user.provider,
                created_at: user.created_at
            }
        };

        console.log('Sending response:', JSON.stringify(responseData, null, 2));
        res.status(200).json(responseData);
    } catch (error) {
        console.error('Error creating/getting user:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation Error',
                message: 'Invalid user data',
                details: error.errors
            });
        }

        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to create or get user',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * GET /api/users/me - Get current user profile
 */
router.get('/me', authMiddleware.verifyToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const user = await userService.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar_url: user.avatar_url,
                provider: user.provider,
                created_at: user.created_at
            }
        });
    } catch (error) {
        console.error('Error getting user profile:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get user profile'
        });
    }
});

/**
 * GET /api/users/tokens - Get user token status
 */
router.get('/tokens', authMiddleware.verifyToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const tokenStatus = await userService.getUserTokenStatus(req.user.id);

        if (!tokenStatus) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'Token status not found'
            });
        }

        res.json({
            success: true,
            tokens: tokenStatus
        });
    } catch (error) {
        console.error('Error getting token status:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get token status'
        });
    }
});

/**
 * GET /api/users/posts - Get user post history
 */
router.get('/posts', authMiddleware.verifyToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const limit = parseInt(req.query.limit as string) || 10;
        const posts = await userService.getUserPostHistory(req.user.id, limit);

        res.json({
            success: true,
            posts
        });
    } catch (error) {
        console.error('Error getting post history:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to get post history'
        });
    }
});

/**
 * POST /api/users/tokens/init - Initialize tokens for user if they don't exist
 */
router.post('/tokens/init', authMiddleware.verifyMcpToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        // Check if user already has tokens
        const existingTokens = await userService.getUserTokenStatus(req.user.id);

        if (existingTokens) {
            return res.json({
                success: true,
                message: 'User already has tokens',
                tokens: existingTokens
            });
        }

        // Initialize tokens for the user
        const newTokens = await userService.initializeUserTokens(req.user.id);

        res.json({
            success: true,
            message: 'Tokens initialized successfully',
            tokens: {
                daily_tokens: newTokens.daily_tokens,
                tokens_used_today: newTokens.tokens_used_today,
                tokens_remaining: newTokens.daily_tokens - newTokens.tokens_used_today,
                last_refresh_date: newTokens.last_refresh_date,
                total_tokens_used: newTokens.total_tokens_used
            }
        });
    } catch (error) {
        console.error('Error initializing tokens:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to initialize tokens'
        });
    }
});

/**
 * POST /api/users/tokens/refresh - Manually refresh daily tokens
 */
router.post('/tokens/refresh', authMiddleware.verifyToken, async (req: Request, res: Response) => {
    try {
        const updatedCount = await userService.refreshDailyTokensIfNeeded();

        res.json({
            success: true,
            message: `Refreshed tokens for ${updatedCount} users`,
            updated_count: updatedCount
        });
    } catch (error) {
        console.error('Error refreshing tokens:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to refresh tokens'
        });
    }
});

/**
 * GET /api/users/linkedin-status - Check LinkedIn connection status
 */
router.get('/linkedin-status', authMiddleware.verifyMcpToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const linkedinConnected = await userService.checkLinkedInConnection(req.user.id);

        res.json({
            success: true,
            connected: linkedinConnected
        });
    } catch (error) {
        console.error('Error checking LinkedIn connection:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to check LinkedIn connection'
        });
    }
});

/**
 * GET /api/users/dashboard-analytics - Get dashboard analytics data
 */
router.get('/dashboard-analytics', authMiddleware.verifyMcpToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const analytics = await userService.getDashboardAnalytics(req.user.id);

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        console.error('Error fetching dashboard analytics:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch dashboard analytics'
        });
    }
});

/**
 * GET /api/users/post-history - Get user's post history with analytics
 */
router.get('/post-history', authMiddleware.verifyMcpToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const limit = parseInt(req.query.limit as string) || 10;
        const posts = await userService.getUserPostHistory(req.user.id, limit);

        res.json({
            success: true,
            data: posts
        });
    } catch (error) {
        console.error('Error fetching post history:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch post history'
        });
    }
});

/**
 * GET /api/users/weekly-stats - Get weekly activity statistics
 */
router.get('/weekly-stats', authMiddleware.verifyMcpToken, async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not authenticated'
            });
        }

        const weeklyStats = await userService.getWeeklyStats(req.user.id);

        res.json({
            success: true,
            data: weeklyStats
        });
    } catch (error) {
        console.error('Error fetching weekly stats:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to fetch weekly stats'
        });
    }
});

export default router;
