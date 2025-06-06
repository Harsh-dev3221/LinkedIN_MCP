-- Migration to remove the scheduled_time constraint that prevents overdue posts
-- This allows posts to remain in the database even after their scheduled time has passed

-- Simple approach: Try to drop the constraint directly
-- PostgreSQL will ignore the command if the constraint doesn't exist

-- Try common constraint names that PostgreSQL might have generated
ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_scheduled_time_check;
ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_check;
ALTER TABLE scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_check1;

-- Add comment to document the change
COMMENT ON COLUMN scheduled_posts.scheduled_time IS 'Scheduled time for post publication. Can be in the past for overdue posts.';

-- Verify the table structure
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'scheduled_posts'::regclass
AND contype = 'c';
