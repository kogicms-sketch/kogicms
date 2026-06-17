-- ============================================================================
-- FIX POLLING UNIT AGENT LOGIN
-- Issue: get_auth_role() returns NULL for polling_unit_agent
--        profiles table might be missing self-view policy for agents
-- ============================================================================

-- 1. Update get_auth_role to include polling_unit_agent checks
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
  
  -- Check user_roles table directly first (Most reliable source)
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id;

  IF _role IS NOT NULL THEN
    RETURN _role;
  END IF;

  -- Fallback checks (Legacy support if user_roles is empty for some reason)
  -- Check for super_admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  ) THEN
    RETURN 'super_admin';
  END IF;
  
  -- Check for lga_chairman
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'lga_chairman'::app_role
  ) THEN
    RETURN 'lga_chairman';
  END IF;
  
  -- Check for councillor
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'councillor'::app_role
  ) THEN
    RETURN 'councillor';
  END IF;

   -- Check for polling_unit_agent
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'polling_unit_agent'::app_role
  ) THEN
    RETURN 'polling_unit_agent';
  END IF;
  
  -- Check for org_admin
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'org_admin'::app_role
  ) THEN
    RETURN 'org_admin';
  END IF;
  
  -- Check for member
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'member'::app_role
  ) THEN
    RETURN 'member';
  END IF;
  
  -- No role found
  RETURN NULL;
END;
$$;

-- 2. Ensure Profiles RLS allows users to view/update their own profile
-- This is critical for initial login data fetching
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Explicitly Grant Permissions to polling_unit_agents table
GRANT SELECT ON public.polling_unit_agents TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
