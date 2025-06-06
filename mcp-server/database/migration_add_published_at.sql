-- Migration to add published_at field to scheduled_posts table
-- This field will track the exact time when a post was successfully published to LinkedIn

-- Add published_at column to scheduled_posts table
ALTER TABLE scheduled_posts 
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Add index for better performance when querying published posts
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_published_at ON scheduled_posts(published_at);

-- Add comment to document the field
COMMENT ON COLUMN scheduled_posts.published_at IS 'Timestamp when the post was actually published to LinkedIn. NULL for pending/failed posts.';

-- Update existing published posts to set published_at = updated_at
-- This provides a reasonable approximation for existing data
UPDATE scheduled_posts 
SET published_at = updated_at 
WHERE status = 'published' AND published_at IS NULL;
