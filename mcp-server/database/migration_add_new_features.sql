-- Migration script to add new features: drafts, scheduled posts, and enhanced analytics
-- Run this script to add the new tables to your existing database

-- Drafts table - stores draft posts for later editing/publishing
CREATE TABLE IF NOT EXISTS drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT NOT NULL,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('basic', 'single', 'multiple')),
    tags TEXT[], -- Array of tags for categorization
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled posts table - stores posts scheduled for future publishing
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    post_type VARCHAR(20) NOT NULL CHECK (post_type IN ('basic', 'single', 'multiple')),
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed', 'cancelled')),
    linkedin_post_id VARCHAR(255), -- Set when published
    error_message TEXT, -- Store error if publishing fails
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Note: Removed CHECK constraint to allow overdue posts to exist
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_time ON scheduled_posts(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- Add triggers for automatic updated_at timestamp updates
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON drafts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for new tables
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for new tables
CREATE POLICY "Users can manage own drafts" ON drafts
    FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own scheduled posts" ON scheduled_posts
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Allow service role full access to new tables
CREATE POLICY "Allow service role full access" ON drafts
    FOR ALL USING (true);

CREATE POLICY "Allow service role full access" ON scheduled_posts
    FOR ALL USING (true);

-- Create a function to get token usage statistics (for analytics)
CREATE OR REPLACE FUNCTION get_token_usage_stats(
    p_user_id UUID,
    p_timeframe VARCHAR(10) DEFAULT '30d'
)
RETURNS TABLE(
    action_type VARCHAR(20),
    usage_count BIGINT,
    total_tokens BIGINT,
    avg_tokens NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate start date based on timeframe
    CASE p_timeframe
        WHEN '7d' THEN start_date := NOW() - INTERVAL '7 days';
        WHEN '30d' THEN start_date := NOW() - INTERVAL '30 days';
        WHEN '90d' THEN start_date := NOW() - INTERVAL '90 days';
        ELSE start_date := '1970-01-01'::timestamp; -- 'all' timeframe
    END CASE;

    RETURN QUERY
    SELECT 
        tuh.action_type,
        COUNT(*) as usage_count,
        SUM(tuh.tokens_consumed) as total_tokens,
        ROUND(AVG(tuh.tokens_consumed), 2) as avg_tokens
    FROM token_usage_history tuh
    WHERE tuh.user_id = p_user_id 
        AND tuh.timestamp >= start_date
    GROUP BY tuh.action_type
    ORDER BY total_tokens DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_timeframe VARCHAR(10) DEFAULT '30d'
)
RETURNS TABLE(
    total_posts BIGINT,
    total_drafts BIGINT,
    total_scheduled BIGINT,
    total_tokens_used BIGINT,
    avg_tokens_per_post NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate start date based on timeframe
    CASE p_timeframe
        WHEN '7d' THEN start_date := NOW() - INTERVAL '7 days';
        WHEN '30d' THEN start_date := NOW() - INTERVAL '30 days';
        WHEN '90d' THEN start_date := NOW() - INTERVAL '90 days';
        ELSE start_date := '1970-01-01'::timestamp; -- 'all' timeframe
    END CASE;

    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM posts WHERE user_id = p_user_id AND created_at >= start_date) as total_posts,
        (SELECT COUNT(*) FROM drafts WHERE user_id = p_user_id AND created_at >= start_date) as total_drafts,
        (SELECT COUNT(*) FROM scheduled_posts WHERE user_id = p_user_id AND created_at >= start_date) as total_scheduled,
        (SELECT COALESCE(SUM(tokens_consumed), 0) FROM token_usage_history WHERE user_id = p_user_id AND timestamp >= start_date) as total_tokens_used,
        (SELECT CASE 
            WHEN COUNT(*) > 0 THEN ROUND(SUM(tokens_consumed)::NUMERIC / COUNT(*), 2)
            ELSE 0 
        END FROM token_usage_history WHERE user_id = p_user_id AND timestamp >= start_date) as avg_tokens_per_post;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy analytics queries
CREATE OR REPLACE VIEW user_analytics_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    ut.daily_tokens,
    ut.tokens_used_today,
    ut.total_tokens_used,
    (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) as total_posts,
    (SELECT COUNT(*) FROM drafts d WHERE d.user_id = u.id) as total_drafts,
    (SELECT COUNT(*) FROM scheduled_posts sp WHERE sp.user_id = u.id AND sp.status = 'pending') as pending_scheduled_posts,
    (SELECT COUNT(*) FROM scheduled_posts sp WHERE sp.user_id = u.id AND sp.status = 'published') as published_scheduled_posts,
    u.created_at as user_since
FROM users u
LEFT JOIN user_tokens ut ON u.id = ut.user_id;

-- Grant necessary permissions
GRANT SELECT ON user_analytics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_token_usage_stats(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(UUID, VARCHAR) TO authenticated;

-- Migration completed successfully
SELECT 'Migration completed: Added drafts, scheduled_posts tables and analytics functions' as status;
