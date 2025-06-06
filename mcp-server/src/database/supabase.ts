import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
}

// Create Supabase client with service role key for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Database table interfaces
export interface User {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    provider: 'google' | 'linkedin';
    provider_id: string;
    created_at: string;
    updated_at: string;
}

export interface UserTokens {
    id: string;
    user_id: string;
    daily_tokens: number;
    tokens_used_today: number;
    last_refresh_date: string;
    total_tokens_used: number;
    created_at: string;
    updated_at: string;
}

export interface TokenUsageHistory {
    id: string;
    user_id: string;
    action_type: 'basic_post' | 'single_post' | 'multiple_post';
    tokens_consumed: number;
    post_content?: string;
    timestamp: string;
}

export interface Posts {
    id: string;
    user_id: string;
    content: string;
    tokens_used: number;
    post_type: 'basic' | 'single' | 'multiple';
    linkedin_post_id?: string;
    created_at: string;
}

export interface Drafts {
    id: string;
    user_id: string;
    title?: string;
    content: string;
    post_type: 'basic' | 'single' | 'multiple';
    tags?: string[];
    created_at: string;
    updated_at: string;
}

export interface ScheduledPosts {
    id: string;
    user_id: string;
    content: string;
    post_type: 'basic' | 'single' | 'multiple';
    scheduled_time: string;
    status: 'pending' | 'published' | 'failed' | 'cancelled';
    linkedin_post_id?: string;
    error_message?: string;
    published_at?: string;
    created_at: string;
    updated_at: string;
}

export type PostType = 'basic' | 'single' | 'multiple';
export type ActionType = 'basic_post' | 'single_post' | 'multiple_post';
export type ScheduledPostStatus = 'pending' | 'published' | 'failed' | 'cancelled';
export type ActivityType = 'post_published' | 'draft_created' | 'draft_updated' | 'post_scheduled' | 'scheduled_post_published' | 'scheduled_post_cancelled';

// Token consumption constants
export const TOKEN_COSTS = {
    BASIC_POST: 0,
    SINGLE_POST: 5,
    MULTIPLE_POST: 10
} as const;

export const DAILY_TOKEN_LIMIT = 50;
