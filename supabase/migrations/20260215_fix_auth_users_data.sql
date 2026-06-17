-- ============================================================================
-- FIX: Repair auth.users data to prevent 500 Error
-- Purpose: The 'email_change' column containing NULL causes Supabase GoTrue to crash.
--          This script ensures no NULL values exist in that column.
-- ============================================================================

UPDATE auth.users 
SET email_change = '' 
WHERE email_change IS NULL;

UPDATE auth.users 
SET phone_change = '' 
WHERE phone_change IS NULL;

-- Reload schema to be safe
NOTIFY pgrst, 'reload schema';
