-- Fix LinkedIn connections foreign key constraint
-- This script fixes the foreign key reference from auth.users to public.users

-- First, drop the existing foreign key constraint
ALTER TABLE public.linkedin_connections 
DROP CONSTRAINT IF EXISTS linkedin_connections_user_id_fkey;

-- Add the correct foreign key constraint pointing to public.users
ALTER TABLE public.linkedin_connections 
ADD CONSTRAINT linkedin_connections_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Verify the constraint was added correctly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='linkedin_connections'
    AND tc.table_schema='public';
