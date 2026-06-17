-- ============================================================================
-- FINAL FIX: SAFE TEXT COMPARISONS & RLS RESET
-- Purpose: Resolve "Database error querying schema" by removing strict Enum dependencies
--          and simplifying RLS to rule out recursion.
-- ============================================================================

-- 1. DROP Potentially Problematic Functions (Skipped to avoid dependency hell)
-- We use CREATE OR REPLACE instead.

-- 2. Re-create Helper Functions using SAFE TEXT COMPARISON
-- We explicitly cast role to text to avoid Enum mismatch errors

CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_lga_chairman()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = 'lga_chairman'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_councillor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = 'councillor'
  );
$$;

-- 3. Re-create Jurisdiction Check (Text Base)
CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL, _polling_unit text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = _lga AND (ward = _ward OR _ward IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = _lga
  ) OR EXISTS (
    SELECT 1 FROM public.polling_unit_agents 
    WHERE user_id = auth.uid() 
    AND lga = _lga 
    AND ward = _ward 
    AND (polling_unit_name = _polling_unit OR _polling_unit IS NULL)
  );
$$;

-- 4. Re-create get_auth_role (Text Base + polling_unit_agent support)
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
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RETURN NULL; END IF;
  
  -- Direct text query, ignore enum strictness
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  RETURN _role; -- Returns NULL if not found, which is fine
END;
$$;

-- 5. RELAX POLICIES for Debugging
-- Ensure Polling Unit Agents can read their own data and common tables

-- User Roles: Allow read for all authenticated users (needed for get_auth_role checks if not security definer, but helps client too)
DROP POLICY IF EXISTS "Authenticated can read roles" ON public.user_roles;
CREATE POLICY "Authenticated can read roles" ON public.user_roles
FOR SELECT TO authenticated
USING (true); -- Debugging: Allow read all roles. Restrict later if needed.

-- Profiles: Allow read for all authenticated
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;
CREATE POLICY "Authenticated can read profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true); -- Debugging: Allow read all profiles.

-- Polling Unit Agents: Allow read for all authenticated (so they can see themselves)
DROP POLICY IF EXISTS "Authenticated can read agents" ON public.polling_unit_agents;
CREATE POLICY "Authenticated can read agents" ON public.polling_unit_agents
FOR SELECT TO authenticated
USING (true);

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
