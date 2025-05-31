import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { Session } from "./SessionsStore.js";
import { LinkedInTokenService } from "../services/LinkedInTokenService.js";

// Define OAuthTokens interface
export interface OAuthTokens {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}

// Define AccessToken3LResponse interface
export interface AccessToken3LResponse {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
}

type AccessTokenPayload = {
    jti: string;
    iat: number;
    exp: number;
    aud: string;
    scopes?: string[];
};

export class TokensStore {
    private _tokensById: Record<
        string,
        {
            mcpServerToken: OAuthTokens;
            linkedinTokens: OAuthTokens;
        }
    > = {};

    private _TOKEN_DURATION_MINUTES = 24 * 60; // 24 hours
    private _jwtSecret: string;
    private _linkedInTokenService: LinkedInTokenService;

    constructor() {
        this._jwtSecret = process.env.JWT_SECRET as string;
        this._linkedInTokenService = new LinkedInTokenService();
    }

    public getTokens = (id: string) => this._tokensById[id];

    public storeTokens = async (
        session: Session,
        linkedinTokens: AccessToken3LResponse,
        userId?: string
    ) => {
        const id = randomUUID();
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const expiresInSeconds = 60 * this._TOKEN_DURATION_MINUTES;
        const payload: AccessTokenPayload = {
            jti: id,
            iat: nowInSeconds,
            exp: nowInSeconds + expiresInSeconds,
            aud: session.client.client_id,
            scopes: session.params.scopes,
        };

        const accessToken = jwt.sign(payload, this._jwtSecret);

        // Store in memory for immediate access
        this._tokensById[id] = {
            mcpServerToken: {
                access_token: accessToken,
                token_type: "Bearer",
                expires_in: expiresInSeconds,
                scope: session.params.scopes?.join(" "),
            },
            linkedinTokens: {
                ...linkedinTokens,
                token_type: "Bearer",
                scope: session.params.scopes?.join(" ") // ✅ FIX: Include scope in LinkedIn tokens too
            },
        };

        // Store LinkedIn tokens in Supabase for persistence
        if (userId) {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
            const success = await this._linkedInTokenService.storeLinkedInTokens(
                userId,
                id, // Use MCP token ID as the link
                {
                    access_token: linkedinTokens.access_token,
                    refresh_token: linkedinTokens.refresh_token,
                    expires_at: expiresAt.toISOString(),
                    linkedin_user_id: session.params.state // LinkedIn user ID from state
                }
            );

            if (!success) {
                console.warn(`Failed to store LinkedIn tokens in Supabase for user: ${userId}`);
            } else {
                console.log(`LinkedIn tokens stored in Supabase for user: ${userId}, MCP token: ${id}`);
            }
        }

        return { id };
    };

    public parseAccessToken = (accessToken: string) =>
        jwt.verify(accessToken, this._jwtSecret) as AccessTokenPayload;

    /**
     * Verify access token and get LinkedIn tokens from Supabase
     */
    public verifyAccessToken = async (accessToken: string) => {
        try {
            const payload = this.parseAccessToken(accessToken);
            const mcpTokenId = payload.jti;

            console.log(`🔍 TokenStore: Verifying access token for MCP token: ${mcpTokenId}`);

            // First check in-memory storage
            const memoryTokens = this._tokensById[mcpTokenId];
            if (memoryTokens) {
                console.log(`✅ TokenStore: Found tokens in memory for MCP token: ${mcpTokenId}`);
                console.log(`🔍 TokenStore: Memory tokens structure:`, {
                    hasLinkedinTokens: !!memoryTokens.linkedinTokens,
                    hasAccessToken: !!(memoryTokens.linkedinTokens?.access_token),
                    tokenLength: memoryTokens.linkedinTokens?.access_token?.length || 0
                });
                return {
                    token: accessToken,
                    extra: { linkedinTokens: memoryTokens.linkedinTokens }
                };
            }

            // If not in memory, fetch from Supabase
            console.log(`🔍 TokenStore: No memory tokens found, fetching from Supabase for MCP token: ${mcpTokenId}`);
            const linkedinTokens = await this._linkedInTokenService.getLinkedInTokens(mcpTokenId);

            if (linkedinTokens) {
                console.log(`✅ TokenStore: Found LinkedIn tokens in Supabase for MCP token: ${mcpTokenId}`);
                console.log(`🔍 TokenStore: Supabase tokens structure:`, {
                    hasAccessToken: !!linkedinTokens.access_token,
                    hasRefreshToken: !!linkedinTokens.refresh_token,
                    tokenLength: linkedinTokens.access_token?.length || 0,
                    expiresAt: linkedinTokens.expires_at
                });

                // Reconstruct the tokens object for compatibility
                const reconstructedTokens = {
                    mcpServerToken: {
                        access_token: accessToken,
                        token_type: "Bearer",
                        scope: payload.scopes?.join(" ") || ""
                    },
                    linkedinTokens: {
                        access_token: linkedinTokens.access_token,
                        refresh_token: linkedinTokens.refresh_token,
                        token_type: "Bearer",
                        scope: payload.scopes?.join(" ") || "" // ✅ FIX: Include scope information
                    }
                };

                // Store back in memory for faster access
                this._tokensById[mcpTokenId] = reconstructedTokens;
                console.log(`✅ TokenStore: Cached tokens in memory for MCP token: ${mcpTokenId}`);

                return {
                    token: accessToken,
                    extra: { linkedinTokens: reconstructedTokens.linkedinTokens }
                };
            } else {
                console.log(`❌ TokenStore: No LinkedIn tokens found in Supabase for MCP token: ${mcpTokenId}`);
                return {
                    token: accessToken,
                    extra: { linkedinTokens: null }
                };
            }
        } catch (error) {
            console.error('❌ TokenStore: Error verifying access token:', error);
            throw error;
        }
    };

    /**
     * Delete LinkedIn tokens for a user
     */
    public deleteLinkedInTokens = async (userId: string, mcpTokenId?: string): Promise<boolean> => {
        try {
            const success = await this._linkedInTokenService.deleteLinkedInTokens(userId, mcpTokenId);

            // Also remove from memory if mcpTokenId is provided
            if (mcpTokenId && this._tokensById[mcpTokenId]) {
                delete this._tokensById[mcpTokenId];
                console.log(`Removed tokens from memory for MCP token: ${mcpTokenId}`);
            }

            return success;
        } catch (error) {
            console.error('Error deleting LinkedIn tokens:', error);
            return false;
        }
    };
}