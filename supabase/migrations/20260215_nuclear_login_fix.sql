-- ============================================================================
-- NUCLEAR OPTION: FIX LOGIN ISSUES
-- Purpose: Forcefully remove all potential blockers for login.
--          1. Drop triggers on auth.users
--          2. Disable RLS on critical tables
--          3. Grant full permissions to authenticated users
--          4. Force schema reload
-- ============================================================================

-- 1. DROP TRIGGERS ON auth.users
-- These triggers execute during the auth transaction. If they fail (even with exception handlers sometimes), auth fails.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;
-- Also drop update triggers if any exist (safety check)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- 2. DISABLE PROFILES TRIGGER if exists
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 3. DISABLE RLS ON CRITICAL TABLES (Temporary debugging measure)
-- We need to know if consistent RLS is the blocker.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_unit_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.councillors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lga_chairmen DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;

-- 4. GRANT BROAD PERMISSIONS
-- Ensure "Authenticated" role has absolutely no permission errors on these tables.
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.polling_unit_agents TO authenticated;
GRANT ALL ON public.councillors TO authenticated;
GRANT ALL ON public.lga_chairmen TO authenticated;
GRANT ALL ON public.members TO authenticated;

-- 5. ENSURE HELPER FUNCTIONS EXIST AND ARE SIMPLE
-- (Re-enforcing the text-based checks)

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  -- Simple direct query
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL, _polling_unit text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Simple OR check, no complex logic
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = _lga
  ) OR EXISTS (
    SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = _lga
  ) OR EXISTS (
    SELECT 1 FROM public.polling_unit_agents 
    WHERE user_id = auth.uid() 
    AND lga = _lga
    -- For debugging, match partially if needed, but keep strict for now to avoid data leak
    AND ward = _ward 
    AND (polling_unit_name = _polling_unit OR _polling_unit IS NULL)
  );
$$;

-- 6. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
