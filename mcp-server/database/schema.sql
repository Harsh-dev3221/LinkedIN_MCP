-- LinkedIn Post Creator Database Schema
-- This schema supports user management, token tracking, and usage analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table - stores user profile information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'linkedin')),
    provider_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure unique provider + provider_id combination
    UNIQUE(provider, provider_id)
);

-- User tokens table - tracks daily token allocation and usage
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    daily_tokens INTEGER NOT NULL DEFAULT 50,
    tokens_used_today INTEGER NOT NULL DEFAULT 0,
    last_refresh_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one token record per user
    UNIQUE(user_id),

    -- Constraints
    CHECK (daily_tokens >= 0),
    CHECK (tokens_used_today >= 0),
    CHECK (tokens_used_today <= daily_tokens),
    CHECK (total_tokens_used >= 0)
);

-- Token usage history - tracks all token consumption events
CREATE TABLE token_usage_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('basic_post', 'single_post', 'multiple_post')),
    tokens_consumed INTEGER NOT NULL,
    post_content TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (tokens_consumed >= 0)
);

-- Posts table - stores created posts for history and analytics
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('basic', 'single', 'multiple')),
    linkedin_post_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CHECK (tokens_used >= 0)
);

-- LinkedIn connections table - stores OAuth tokens for LinkedIn integration
CREATE TABLE linkedin_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mcp_token_id TEXT NOT NULL,
    linkedin_access_token TEXT NOT NULL,
    linkedin_refresh_token TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    linkedin_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique token per user
    UNIQUE(user_id, mcp_token_id)
);

-- ============================================================================
-- TRACKED POSTS TABLE - SOLUTION FOR LINKEDIN API LIMITATIONS
-- ============================================================================
--
-- LinkedIn API restricts access to user posts, profile pictures, and detailed profiles.
-- This table tracks posts created through our app for complete post management.
--
-- LINKEDIN API LIMITATIONS (Based on application logs):
-- ❌ User's existing posts (requires restricted scopes)
-- ❌ Profile pictures (403 Forbidden - API limitation)
-- ❌ Detailed profile data (restricted to basic OpenID Connect)
-- ❌ Historical engagement data (not available via public API)
--
-- OUR SOLUTION:
-- ✅ Track all posts created through PostWizz
-- ✅ Store engagement data when available
-- ✅ Enable complete edit/delete functionality
-- ✅ Provide analytics for tracked posts
-- ✅ Soft delete for data retention
-- ============================================================================

CREATE TABLE tracked_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- LinkedIn post identifiers
    linkedin_post_id TEXT NOT NULL, -- Short ID from LinkedIn response
    linkedin_post_urn TEXT NOT NULL UNIQUE, -- Full URN for API operations

    -- Post content and metadata
    content TEXT NOT NULL,
    visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC', 'CONNECTIONS', 'LOGGED_IN_MEMBERS')),
    post_type TEXT NOT NULL CHECK (post_type IN ('text', 'image', 'video', 'article')),

    -- Engagement statistics (updated when available from LinkedIn)
    engagement_stats JSONB DEFAULT '{}',

    -- Tracking metadata
    tokens_used INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
CREATE INDEX idx_user_tokens_user_id ON user_tokens(user_id);
CREATE INDEX idx_user_tokens_refresh_date ON user_tokens(last_refresh_date);
CREATE INDEX idx_token_usage_user_id ON token_usage_history(user_id);
CREATE INDEX idx_token_usage_timestamp ON token_usage_history(timestamp);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_linkedin_connections_user_id ON linkedin_connections(user_id);
CREATE INDEX idx_linkedin_connections_mcp_token ON linkedin_connections(mcp_token_id);
CREATE INDEX idx_linkedin_connections_expires_at ON linkedin_connections(expires_at);

-- Tracked posts indexes for efficient queries
CREATE INDEX idx_tracked_posts_user_id ON tracked_posts(user_id);
CREATE INDEX idx_tracked_posts_linkedin_urn ON tracked_posts(linkedin_post_urn);
CREATE INDEX idx_tracked_posts_created_at ON tracked_posts(created_at DESC);
CREATE INDEX idx_tracked_posts_user_created ON tracked_posts(user_id, created_at DESC);
CREATE INDEX idx_tracked_posts_not_deleted ON tracked_posts(user_id, is_deleted) WHERE is_deleted = FALSE;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at BEFORE UPDATE ON user_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_posts_updated_at BEFORE UPDATE ON tracked_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to refresh daily tokens
CREATE OR REPLACE FUNCTION refresh_daily_tokens()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_tokens
    SET
        tokens_used_today = 0,
        last_refresh_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE last_refresh_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to consume tokens for a user
CREATE OR REPLACE FUNCTION consume_tokens(
    p_user_id UUID,
    p_action_type VARCHAR(20),
    p_tokens_to_consume INTEGER,
    p_post_content TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_tokens INTEGER;
    current_used INTEGER;
BEGIN
    -- First, refresh tokens if needed
    PERFORM refresh_daily_tokens();

    -- Get current token status
    SELECT daily_tokens, tokens_used_today
    INTO current_tokens, current_used
    FROM user_tokens
    WHERE user_id = p_user_id;

    -- Check if user exists and has enough tokens
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    IF (current_used + p_tokens_to_consume) > current_tokens THEN
        RETURN FALSE; -- Not enough tokens
    END IF;

    -- Consume tokens
    UPDATE user_tokens
    SET
        tokens_used_today = tokens_used_today + p_tokens_to_consume,
        total_tokens_used = total_tokens_used + p_tokens_to_consume,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Record usage history
    INSERT INTO token_usage_history (user_id, action_type, tokens_consumed, post_content)
    VALUES (p_user_id, p_action_type, p_tokens_to_consume, p_post_content);

    RETURN TRUE; -- Success
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id::text);

-- Token policies
CREATE POLICY "Users can view own tokens" ON user_tokens
    FOR SELECT USING (auth.uid() = user_id::text);

CREATE POLICY "Users can view own usage history" ON token_usage_history
    FOR SELECT USING (auth.uid() = user_id::text);

CREATE POLICY "Users can view own posts" ON posts
    FOR SELECT USING (auth.uid() = user_id::text);

CREATE POLICY "Users can view own linkedin connections" ON linkedin_connections
    FOR SELECT USING (auth.uid() = user_id::text);

CREATE POLICY "Users can view own tracked posts" ON tracked_posts
    FOR SELECT USING (auth.uid() = user_id::text);

-- Service role can do everything (for backend operations)
-- Note: Service role bypasses RLS by default in Supabase, but we add these for clarity

CREATE POLICY "Service role full access users" ON users
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access tokens" ON user_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access history" ON token_usage_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access posts" ON posts
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access linkedin connections" ON linkedin_connections
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access tracked posts" ON tracked_posts
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- LINKEDIN API LIMITATIONS DOCUMENTATION
-- ============================================================================
--
-- Based on application logs, LinkedIn API returns 403 errors for:
-- 1. Profile picture requests (/v2/people/(id)/profilePicture)
-- 2. Detailed profile data (beyond OpenID Connect)
-- 3. Historical posts retrieval
--
-- CURRENT WORKING SCOPES: openid, profile, email, w_member_social
--
-- IMPLEMENTED WORKAROUNDS:
-- ✅ Use OpenID Connect for basic profile (name, email) - WORKING
-- ✅ Track posts created through our app in tracked_posts table - WORKING
-- ✅ Store engagement data when LinkedIn provides it - WORKING
-- ✅ Fallback to user initials instead of profile pictures - WORKING
-- ✅ Focus on content creation rather than historical data - WORKING
--
-- RECOMMENDED APPROACH:
-- 1. Create posts through our app (works perfectly with w_member_social)
-- 2. Track them in tracked_posts table automatically
-- 3. Use tracked data for analytics and post management
-- 4. Accept LinkedIn's API limitations for historical/profile data
-- 5. Focus on the core value: AI-powered content creation
-- ============================================================================
