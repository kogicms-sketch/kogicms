-- ============================================================================
-- MANUAL VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor after applying the migration
-- ============================================================================

-- Step 1: Check function signatures match
SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    prosecdef AS is_security_definer
FROM pg_proc 
WHERE proname IN ('get_user_role', 'get_auth_role')
AND pronamespace = 'public'::regnamespace;

-- Expected: get_user_role should show "_user_id uuid"

-- Step 2: Verify triggers were dropped
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'profiles'
AND trigger_name IN ('on_profile_phone_change', 'on_profile_status_change');

-- Expected: No rows (triggers should be dropped)

-- Step 3: Test get_user_role with a test UUID (replace with actual councillor user ID)
-- SELECT public.get_user_role('REPLACE_WITH_ACTUAL_USER_UUID'::uuid);

-- Step 4: Find a councillor user to test with
SELECT 
    u.id,
    u.email,
    ur.role,
    p.account_status
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
LEFT JOIN public.profiles p ON u.id = p.id
WHERE ur.role = 'councillor'
LIMIT 5;

-- Step 5: Test the function with a real councillor (copy ID from above results)
-- SELECT public.get_user_role('PASTE_USER_ID_HERE'::uuid);

-- Step 6: Simulate authenticated context and test get_auth_role
-- Replace 'YOUR_USER_ID' with an actual councillor user ID
/*
DO $$
DECLARE
    test_user_id uuid := 'YOUR_USER_ID'::uuid;
    result text;
BEGIN
    -- Mock the auth context
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
    
    -- Test get_auth_role
    result := public.get_auth_role();
    
    RAISE NOTICE 'get_auth_role returned: %', result;
END $$;
*/

-- Step 7: Check for any errors in recent PostgreSQL logs
-- SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)';

-- Step 8: Verify RLS policies on critical tables
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_roles', 'councillors')
ORDER BY tablename, policyname;

-- Step 9: Test direct table access (simulating RPC bypass)
-- This should work if permissions are correct
/*
DO $$
DECLARE
    test_user_id uuid := 'YOUR_USER_ID'::uuid;
    found_role public.app_role;
BEGIN
    SELECT role INTO found_role
    FROM public.user_roles
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Direct query result: %', found_role;
END $$;
*/

-- ============================================================================
-- RE-ADD TRIGGERS (Only after confirming login works!)
-- Uncomment and run this section once login is successful
-- ============================================================================
/*
-- Recreate audit triggers
DROP TRIGGER IF EXISTS on_profile_phone_change ON public.profiles;
CREATE TRIGGER on_profile_phone_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)
EXECUTE FUNCTION log_admin_phone_change();

DROP TRIGGER IF EXISTS on_profile_status_change ON public.profiles;
CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status)
EXECUTE FUNCTION log_admin_status_change();

-- Verify triggers were recreated
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'profiles'
AND trigger_name IN ('on_profile_phone_change', 'on_profile_status_change');
*/

-- ============================================================================
-- COMMON ISSUES AND FIXES
-- ============================================================================

-- Issue: "function get_user_role(uuid) does not exist"
-- Fix: Run the migration file 20260214_fix_triggers_and_rpc.sql

-- Issue: "permission denied for schema public"
-- Fix: Check grants with: \dn+ public

-- Issue: "role councillor not found in enum app_role"
-- Fix: Check enum values: SELECT enumlabel FROM pg_enum WHERE enumtypid = 'app_role'::regtype;

-- Issue: Login still fails after migration
-- Check: Browser console for exact error, Supabase logs for server-side errors
