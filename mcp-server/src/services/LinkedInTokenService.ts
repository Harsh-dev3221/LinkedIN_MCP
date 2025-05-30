import { createClient } from '@supabase/supabase-js';

interface LinkedInTokens {
    access_token: string;
    refresh_token?: string;
    expires_at: string;
    linkedin_user_id?: string;
}

interface StoredLinkedInConnection {
    id: string;
    user_id: string;
    mcp_token_id: string;
    linkedin_access_token: string;
    linkedin_refresh_token?: string;
    expires_at: string;
    linkedin_user_id?: string;
    created_at: string;
    updated_at: string;
}

export class LinkedInTokenService {
    private supabase;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        console.log('🔧 Initializing LinkedInTokenService...');
        console.log('Supabase URL configured:', !!supabaseUrl);
        console.log('Supabase Service Key configured:', !!supabaseServiceKey);

        if (!supabaseUrl || !supabaseServiceKey) {
            const error = 'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.';
            console.error('❌', error);
            throw new Error(error);
        }

        // Use service role key for backend operations
        this.supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ LinkedInTokenService initialized successfully');
    }

    /**
     * Store LinkedIn tokens for a user
     */
    async storeLinkedInTokens(
        userId: string,
        mcpTokenId: string,
        tokens: LinkedInTokens
    ): Promise<boolean> {
        try {
            console.log(`Storing LinkedIn tokens for user: ${userId}, MCP token: ${mcpTokenId}`);

            const { data, error } = await this.supabase
                .from('linkedin_connections')
                .upsert({
                    user_id: userId,
                    mcp_token_id: mcpTokenId,
                    linkedin_access_token: tokens.access_token,
                    linkedin_refresh_token: tokens.refresh_token || null,
                    linkedin_user_id: tokens.linkedin_user_id || null,
                    expires_at: tokens.expires_at,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,mcp_token_id'
                });

            if (error) {
                console.error('Error storing LinkedIn tokens:', error);
                return false;
            }

            console.log('LinkedIn tokens stored successfully:', data);
            return true;
        } catch (error) {
            console.error('Exception storing LinkedIn tokens:', error);
            return false;
        }
    }

    /**
     * Get LinkedIn tokens for a user by MCP token ID
     */
    async getLinkedInTokens(mcpTokenId: string): Promise<LinkedInTokens | null> {
        try {
            console.log(`Fetching LinkedIn tokens for MCP token: ${mcpTokenId}`);

            // First, let's check if there are ANY tokens for this MCP token (ignoring expiration)
            const { data: allData, error: allError } = await this.supabase
                .from('linkedin_connections')
                .select('*')
                .eq('mcp_token_id', mcpTokenId);

            if (allData && allData.length > 0) {
                console.log(`🔍 Found ${allData.length} LinkedIn connection(s) for MCP token: ${mcpTokenId}`);
                allData.forEach((conn, index) => {
                    console.log(`  Connection ${index + 1}:`, {
                        user_id: conn.user_id,
                        expires_at: conn.expires_at,
                        isExpired: new Date(conn.expires_at) <= new Date(),
                        created_at: conn.created_at
                    });
                });
            } else {
                console.log(`❌ No LinkedIn connections found at all for MCP token: ${mcpTokenId}`);
            }

            // Now get only non-expired tokens
            const { data, error } = await this.supabase
                .from('linkedin_connections')
                .select('*')
                .eq('mcp_token_id', mcpTokenId)
                .gt('expires_at', new Date().toISOString()) // Only get non-expired tokens
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No rows found
                    console.log(`No valid LinkedIn tokens found for MCP token: ${mcpTokenId}`);
                    return null;
                }
                console.error('Error fetching LinkedIn tokens:', error);
                return null;
            }

            if (!data) {
                console.log(`No LinkedIn tokens found for MCP token: ${mcpTokenId}`);
                return null;
            }

            console.log(`LinkedIn tokens found for MCP token: ${mcpTokenId}`);
            return {
                access_token: data.linkedin_access_token,
                refresh_token: data.linkedin_refresh_token || undefined,
                expires_at: data.expires_at,
                linkedin_user_id: data.linkedin_user_id || undefined
            };
        } catch (error) {
            console.error('Exception fetching LinkedIn tokens:', error);
            return null;
        }
    }

    /**
     * Get LinkedIn tokens by user ID
     */
    async getLinkedInTokensByUserId(userId: string): Promise<LinkedInTokens | null> {
        try {
            console.log(`Fetching LinkedIn tokens for user: ${userId}`);

            const { data, error } = await this.supabase
                .from('linkedin_connections')
                .select('*')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString()) // Only get non-expired tokens
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log(`No valid LinkedIn tokens found for user: ${userId}`);
                    return null;
                }
                console.error('Error fetching LinkedIn tokens by user ID:', error);
                return null;
            }

            if (!data) {
                console.log(`No LinkedIn tokens found for user: ${userId}`);
                return null;
            }

            console.log(`LinkedIn tokens found for user: ${userId}`);
            return {
                access_token: data.linkedin_access_token,
                refresh_token: data.linkedin_refresh_token || undefined,
                expires_at: data.expires_at,
                linkedin_user_id: data.linkedin_user_id || undefined
            };
        } catch (error) {
            console.error('Exception fetching LinkedIn tokens by user ID:', error);
            return null;
        }
    }

    /**
     * Delete LinkedIn tokens for a user
     */
    async deleteLinkedInTokens(userId: string, mcpTokenId?: string): Promise<boolean> {
        try {
            console.log(`Deleting LinkedIn tokens for user: ${userId}${mcpTokenId ? `, MCP token: ${mcpTokenId}` : ''}`);

            let query = this.supabase
                .from('linkedin_connections')
                .delete()
                .eq('user_id', userId);

            if (mcpTokenId) {
                query = query.eq('mcp_token_id', mcpTokenId);
            }

            const { error } = await query;

            if (error) {
                console.error('Error deleting LinkedIn tokens:', error);
                return false;
            }

            console.log('LinkedIn tokens deleted successfully');
            return true;
        } catch (error) {
            console.error('Exception deleting LinkedIn tokens:', error);
            return false;
        }
    }

    /**
     * Check if user has valid LinkedIn connection
     */
    async hasValidLinkedInConnection(userId: string): Promise<boolean> {
        try {
            const tokens = await this.getLinkedInTokensByUserId(userId);
            return tokens !== null;
        } catch (error) {
            console.error('Exception checking LinkedIn connection:', error);
            return false;
        }
    }

    /**
     * Clean up expired tokens (maintenance function)
     */
    async cleanupExpiredTokens(): Promise<number> {
        try {
            console.log('Cleaning up expired LinkedIn tokens...');

            const { data, error } = await this.supabase
                .rpc('cleanup_expired_linkedin_tokens');

            if (error) {
                console.error('Error cleaning up expired tokens:', error);
                return 0;
            }

            const deletedCount = data || 0;
            console.log(`Cleaned up ${deletedCount} expired LinkedIn tokens`);
            return deletedCount;
        } catch (error) {
            console.error('Exception cleaning up expired tokens:', error);
            return 0;
        }
    }

    /**
     * Get all LinkedIn connections for a user (for debugging/admin)
     */
    async getAllUserConnections(userId: string): Promise<StoredLinkedInConnection[]> {
        try {
            const { data, error } = await this.supabase
                .from('linkedin_connections')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching user connections:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('Exception fetching user connections:', error);
            return [];
        }
    }
}
