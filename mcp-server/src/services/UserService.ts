import { supabase, User, UserTokens, TOKEN_COSTS, DAILY_TOKEN_LIMIT } from '../database/supabase.js';

export interface CreateUserData {
    email: string;
    name?: string;
    avatar_url?: string;
    provider: 'google' | 'linkedin';
    provider_id: string;
}

export interface TokenStatus {
    daily_tokens: number;
    tokens_used_today: number;
    tokens_remaining: number;
    last_refresh_date: string;
    total_tokens_used: number;
}

export class UserService {
    /**
     * Create a new user or return existing user
     */
    async createOrGetUser(userData: CreateUserData): Promise<User> {
        try {
            console.log('Creating or getting user:', userData.email);
            console.log('Looking for user with provider:', userData.provider, 'provider_id:', userData.provider_id);

            // First, try to find existing user by provider and provider_id
            const { data: existingUserByProvider, error: findByProviderError } = await supabase
                .from('users')
                .select('*')
                .eq('provider', userData.provider)
                .eq('provider_id', userData.provider_id)
                .single();

            if (existingUserByProvider && !findByProviderError) {
                console.log('Found existing user by provider+provider_id:', existingUserByProvider.email);

                // Update user info if needed
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        email: userData.email,
                        name: userData.name,
                        avatar_url: userData.avatar_url,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingUserByProvider.id)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error(`Failed to update user: ${updateError.message}`);
                }

                console.log('Updated existing user successfully');
                return updatedUser;
            }

            // If not found by provider+provider_id, try to find by email
            console.log('User not found by provider+provider_id, checking by email...');
            const { data: existingUserByEmail, error: findByEmailError } = await supabase
                .from('users')
                .select('*')
                .eq('email', userData.email)
                .single();

            if (existingUserByEmail && !findByEmailError) {
                console.log('Found existing user by email:', existingUserByEmail.email);
                console.log('Updating provider_id from', existingUserByEmail.provider_id, 'to', userData.provider_id);

                // Update user with new provider_id and other info
                const { data: updatedUser, error: updateError } = await supabase
                    .from('users')
                    .update({
                        name: userData.name,
                        avatar_url: userData.avatar_url,
                        provider_id: userData.provider_id, // Update provider_id
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingUserByEmail.id)
                    .select()
                    .single();

                if (updateError) {
                    throw new Error(`Failed to update user: ${updateError.message}`);
                }

                console.log('Updated existing user with new provider_id successfully');
                return updatedUser;
            }

            console.log('Creating new user...');

            // Create new user
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([userData])
                .select()
                .single();

            if (createError) {
                throw new Error(`Failed to create user: ${createError.message}`);
            }

            console.log('New user created:', newUser.email);

            // 🎉 Initialize user tokens with 50 signup bonus!
            await this.initializeUserTokens(newUser.id);
            console.log('Initialized 50 signup bonus tokens for new user');

            return newUser;
        } catch (error) {
            console.error('Error in createOrGetUser:', error);
            throw error;
        }
    }

    /**
     * Initialize token allocation for a new user
     */
    async initializeUserTokens(userId: string): Promise<UserTokens> {
        try {
            const { data: tokens, error } = await supabase
                .from('user_tokens')
                .insert([{
                    user_id: userId,
                    daily_tokens: DAILY_TOKEN_LIMIT,
                    tokens_used_today: 0,
                    last_refresh_date: new Date().toISOString().split('T')[0],
                    total_tokens_used: 0
                }])
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to initialize user tokens: ${error.message}`);
            }

            return tokens;
        } catch (error) {
            console.error('Error initializing user tokens:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<User | null> {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw new Error(`Failed to get user: ${error.message}`);
            }

            return user;
        } catch (error) {
            console.error('Error getting user by ID:', error);
            throw error;
        }
    }

    /**
     * Get user by provider ID (Supabase auth user ID)
     */
    async getUserByProviderId(providerId: string): Promise<User | null> {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('provider_id', providerId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw new Error(`Failed to get user by provider ID: ${error.message}`);
            }

            return user;
        } catch (error) {
            console.error('Error getting user by provider ID:', error);
            throw error;
        }
    }

    /**
     * Get user token status
     */
    async getUserTokenStatus(userId: string): Promise<TokenStatus | null> {
        try {
            // First refresh tokens if needed
            await this.refreshDailyTokensIfNeeded();

            const { data: tokens, error } = await supabase
                .from('user_tokens')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw new Error(`Failed to get user tokens: ${error.message}`);
            }

            if (!tokens) {
                return null;
            }

            return {
                daily_tokens: tokens.daily_tokens,
                tokens_used_today: tokens.tokens_used_today,
                tokens_remaining: tokens.daily_tokens - tokens.tokens_used_today,
                last_refresh_date: tokens.last_refresh_date,
                total_tokens_used: tokens.total_tokens_used
            };
        } catch (error) {
            console.error('Error getting user token status:', error);
            throw error;
        }
    }

    /**
     * Check if user has enough tokens for an action
     */
    async canConsumeTokens(userId: string, actionType: keyof typeof TOKEN_COSTS): Promise<boolean> {
        try {
            const tokenStatus = await this.getUserTokenStatus(userId);
            if (!tokenStatus) {
                return false;
            }

            const tokensNeeded = TOKEN_COSTS[actionType];
            return tokenStatus.tokens_remaining >= tokensNeeded;
        } catch (error) {
            console.error('Error checking token availability:', error);
            return false;
        }
    }

    /**
     * Consume tokens for an action
     */
    async consumeTokens(
        userId: string,
        actionType: keyof typeof TOKEN_COSTS,
        postContent?: string
    ): Promise<boolean> {
        try {
            const tokensToConsume = TOKEN_COSTS[actionType];

            // Use the database function to consume tokens atomically
            const { data, error } = await supabase.rpc('consume_tokens', {
                p_user_id: userId,
                p_action_type: actionType.toLowerCase(),
                p_tokens_to_consume: tokensToConsume,
                p_post_content: postContent
            });

            if (error) {
                console.error('Error consuming tokens:', error);
                return false;
            }

            return data === true;
        } catch (error) {
            console.error('Error in consumeTokens:', error);
            return false;
        }
    }

    /**
     * Refresh daily tokens for all users if needed
     */
    async refreshDailyTokensIfNeeded(): Promise<number> {
        try {
            const { data: updatedCount, error } = await supabase.rpc('refresh_daily_tokens');

            if (error) {
                console.error('Error refreshing daily tokens:', error);
                return 0;
            }

            if (updatedCount > 0) {
                console.log(`Refreshed daily tokens for ${updatedCount} users`);
            }

            return updatedCount || 0;
        } catch (error) {
            console.error('Error in refreshDailyTokensIfNeeded:', error);
            return 0;
        }
    }

    /**
     * Get user's post history
     */
    async getUserPostHistory(userId: string, limit: number = 10): Promise<any[]> {
        try {
            const { data: posts, error } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                throw new Error(`Failed to get user posts: ${error.message}`);
            }

            return posts || [];
        } catch (error) {
            console.error('Error getting user post history:', error);
            throw error;
        }
    }

    /**
     * Record a created post
     */
    async recordPost(
        userId: string,
        content: string,
        tokensUsed: number,
        postType: 'basic' | 'single' | 'multiple',
        linkedinPostId?: string
    ): Promise<void> {
        try {
            const { error } = await supabase
                .from('posts')
                .insert([{
                    user_id: userId,
                    content,
                    tokens_used: tokensUsed,
                    post_type: postType,
                    linkedin_post_id: linkedinPostId
                }]);

            if (error) {
                throw new Error(`Failed to record post: ${error.message}`);
            }
        } catch (error) {
            console.error('Error recording post:', error);
            throw error;
        }
    }

    /**
     * Check if user has LinkedIn connection
     * For now, we'll assume users are connected if they've reached this point
     * since LinkedIn OAuth is required to access the post creation features
     */
    async checkLinkedInConnection(userId: string): Promise<boolean> {
        try {
            // Simple implementation: if user exists and has tokens, assume LinkedIn is connected
            // This is because users must go through LinkedIn OAuth to use posting features
            const tokenStatus = await this.getUserTokenStatus(userId);
            return tokenStatus !== null;
        } catch (error) {
            console.error('Error checking LinkedIn connection:', error);
            return false;
        }
    }
}
