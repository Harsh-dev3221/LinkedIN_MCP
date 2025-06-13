import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/supabase.js';
import { UserService } from '../services/UserService.js';
import { LinkedInTokenService } from '../services/LinkedInTokenService.js';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name?: string;
                avatar_url?: string;
                provider: 'google' | 'linkedin';
            };
        }
    }
}

export class AuthMiddleware {
    private userService: UserService;
    private linkedinTokenService: LinkedInTokenService;

    constructor() {
        this.userService = new UserService();
        this.linkedinTokenService = new LinkedInTokenService();
    }

    /**
     * Middleware to verify Supabase JWT token
     */
    verifyToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Missing or invalid authorization header'
                });
            }

            const token = authHeader.replace('Bearer ', '');

            // Verify the JWT token with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (error || !user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid or expired token'
                });
            }

            // Get user from our database by provider_id (which stores the Supabase auth user ID)
            const dbUser = await this.userService.getUserByProviderId(user.id);

            if (!dbUser) {
                console.log('User not found in database, they might be new:', user.email);
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User not found in database. Please complete signup first.'
                });
            }

            // Attach user to request
            req.user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                avatar_url: dbUser.avatar_url,
                provider: dbUser.provider
            };

            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            return res.status(500).json({
                error: 'Internal Server Error',
                message: 'Authentication verification failed'
            });
        }
    };

    /**
     * Middleware to check if user has enough tokens for an action
     */
    checkTokens = (actionType: 'BASIC_POST' | 'SINGLE_POST' | 'MULTIPLE_POST') => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        error: 'Unauthorized',
                        message: 'User not authenticated'
                    });
                }

                const canConsume = await this.userService.canConsumeTokens(req.user.id, actionType);

                if (!canConsume) {
                    const tokenStatus = await this.userService.getUserTokenStatus(req.user.id);
                    return res.status(403).json({
                        error: 'Insufficient Tokens',
                        message: 'Not enough tokens for this action',
                        tokenStatus
                    });
                }

                next();
            } catch (error) {
                console.error('Token check middleware error:', error);
                return res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Token verification failed'
                });
            }
        };
    };

    /**
     * Optional middleware - doesn't fail if no token provided
     */
    optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return next(); // Continue without user
            }

            const token = authHeader.replace('Bearer ', '');

            // Verify the JWT token with Supabase
            const { data: { user }, error } = await supabase.auth.getUser(token);

            if (!error && user) {
                // Get user from our database by provider_id
                const dbUser = await this.userService.getUserByProviderId(user.id);

                if (dbUser) {
                    // Attach user to request
                    req.user = {
                        id: dbUser.id,
                        email: dbUser.email,
                        name: dbUser.name,
                        avatar_url: dbUser.avatar_url,
                        provider: dbUser.provider
                    };
                }
            }

            next();
        } catch (error) {
            console.error('Optional auth middleware error:', error);
            // Don't fail the request, just continue without user
            next();
        }
    };

    /**
     * Middleware to verify MCP JWT token and get user from LinkedIn connection
     */
    verifyMcpToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authHeader = req.headers.authorization;

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Missing or invalid authorization header'
                });
            }

            const token = authHeader.replace('Bearer ', '');

            // Parse the MCP JWT token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET not configured');
            }

            const payload = jwt.verify(token, jwtSecret) as any;
            const mcpTokenId = payload.jti;

            if (!mcpTokenId) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid MCP token format'
                });
            }

            // Get user ID from LinkedIn connection using MCP token ID
            const connection = await this.linkedinTokenService.getConnectionByMcpToken(mcpTokenId);

            if (!connection) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'MCP token not found or expired'
                });
            }

            // Get user details from our database
            const dbUser = await this.userService.getUserById(connection.user_id);

            if (!dbUser) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'User not found'
                });
            }

            // Attach user to request
            req.user = {
                id: dbUser.id,
                email: dbUser.email,
                name: dbUser.name,
                avatar_url: dbUser.avatar_url,
                provider: dbUser.provider
            };

            next();
        } catch (error) {
            console.error('MCP auth middleware error:', error);
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired MCP token'
            });
        }
    };
}

// Create singleton instance
export const authMiddleware = new AuthMiddleware();
