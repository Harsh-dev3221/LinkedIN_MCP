-- Fix for the specific duplicate post issue
-- This post was already published to LinkedIn but the database wasn't updated

-- First, add the published_at column if it doesn't exist
ALTER TABLE scheduled_posts 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Update the specific post that was causing the duplicate error
-- Post ID: b2abde38-fa57-4d56-940a-d693f8956e86
-- LinkedIn URN: urn:li:share:7360337385882025984
UPDATE scheduled_posts 
SET 
    status = 'published',
    linkedin_post_id = 'urn:li:share:7360337385882025984',
    published_at = updated_at,
    error_message = 'Post was already published to LinkedIn (duplicate detected and fixed)',
    updated_at = NOW()
WHERE id = 'b2abde38-fa57-4d56-940a-d693f8956e86'
AND status = 'pending';

-- Verify the update
SELECT id, status, linkedin_post_id, published_at, error_message 
FROM scheduled_posts 
WHERE id = 'b2abde38-fa57-4d56-940a-d693f8956e86';
