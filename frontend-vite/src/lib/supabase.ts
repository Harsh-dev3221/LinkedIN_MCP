import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

// Types for our application
export interface User {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    provider: 'google' | 'linkedin';
}

export interface TokenStatus {
    daily_tokens: number;
    tokens_used_today: number;
    tokens_remaining: number;
    last_refresh_date: string;
    total_tokens_used: number;
}

export interface PostHistory {
    id: string;
    content: string;
    tokens_used: number;
    post_type: 'basic' | 'single' | 'multiple';
    created_at: string;
}

// Token costs (should match backend)
export const TOKEN_COSTS = {
    BASIC_POST: 0,
    SINGLE_POST: 5,
    MULTIPLE_POST: 10
} as const;

export const DAILY_TOKEN_LIMIT = 50;
