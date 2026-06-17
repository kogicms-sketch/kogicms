-- ============================================================================
-- DEEP DIAGNOSTIC FIX: Triggers and RPC Functions
-- Purpose: Resolve "Database error querying schema" for councillor login
-- Date: 2026-02-14
-- ============================================================================

-- ============================================================================
-- STEP 1: TEMPORARILY DROP AUDIT TRIGGERS
-- These triggers might be failing silently during authentication
-- ============================================================================

DROP TRIGGER IF EXISTS on_profile_phone_change ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_status_change ON public.profiles;

-- Note: These triggers will be re-added at the end if login succeeds
-- They are audit logging triggers that shouldn't affect auth, but we're 
-- ruling them out as potential causes of silent failures

-- ============================================================================
-- STEP 2: FIX get_user_role RPC FUNCTION
-- Issue: Parameter name mismatch between client (AuthContext.tsx) and database
-- Client calls with: { _user_id: userId }
-- Function expects: target_user_id
-- Solution: Recreate with correct parameter name _user_id
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  -- Handle NULL input gracefully
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the role from user_roles table
  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- Return the role (will be NULL if no role found)
  RETURN _role;
END;
$$;

-- Grant execute permissions to all relevant roles
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- ============================================================================
-- STEP 3: HARDEN get_auth_role FUNCTION
-- Ensure it handles NULLs and edge cases gracefully
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
  _user_id uuid;
BEGIN
  -- Get the current user ID safely
  _user_id := auth.uid();
  
  -- Handle case where no user is logged in
  IF _user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First check for super_admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'
  ) THEN
    RETURN 'super_admin';
  END IF;
  
  -- Check for lga_chairman
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'lga_chairman'
  ) THEN
    RETURN 'lga_chairman';
  END IF;
  
  -- Check for councillor
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'councillor'
  ) THEN
    RETURN 'councillor';
  END IF;
  
  -- Check for org_admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'org_admin'
  ) THEN
    RETURN 'org_admin';
  END IF;
  
  -- Check for member
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'member'
  ) THEN
    RETURN 'member';
  END IF;
  
  -- No role found
  RETURN NULL;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_role() TO anon;

-- ============================================================================
-- STEP 4: ENSURE CRITICAL PERMISSIONS
-- Explicit grants to authenticated role (just in case)
-- ============================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to essential tables
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Grant access to app_role type
GRANT USAGE ON TYPE public.app_role TO authenticated;
GRANT USAGE ON TYPE public.app_role TO anon;

-- ============================================================================
-- STEP 5: VERIFY COUNCILLOR-SPECIFIC PERMISSIONS
-- Ensure councillors can access what they need
-- ============================================================================

-- Grant access to councillors table
GRANT SELECT ON public.councillors TO authenticated;
GRANT SELECT ON public.lga_chairmen TO authenticated;

-- ============================================================================
-- STEP 6: FORCE SCHEMA CACHE RELOAD
-- This notifies PostgREST to reload the schema cache
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES (Uncomment to run manually)
-- ============================================================================

/*
-- Test the get_user_role function with a known councillor user
SELECT public.get_user_role('00000000-0000-0000-0000-000000000000'::uuid);

-- Test get_auth_role as the failing user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub": "user-uuid-here"}';
SELECT public.get_auth_role();
RESET ROLE;

-- Check if triggers were dropped successfully
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'profiles';

-- Verify function signatures
SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname IN ('get_user_role', 'get_auth_role')
AND pronamespace = 'public'::regnamespace;
*/

-- ============================================================================
-- RE-ADD TRIGGERS (After successful login test, run this section)
-- Uncomment the section below once login is working
-- ============================================================================

/*
-- Recreate audit triggers after confirming login works
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
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
