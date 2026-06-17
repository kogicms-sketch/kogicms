-- ============================================================================
-- RESTORE SECURITY & RLS
-- Purpose: Re-enable RLS disabled by "nuclear" options and implement strict policies.
-- ============================================================================

-- 1. RE-ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_unit_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.councillors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lga_chairmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 2. REVOKE EXCESSIVE PERMISSIONS
-- The "Nuclear" option granted ALL to authenticated. We must revoke this.
REVOKE ALL ON public.profiles FROM authenticated;
REVOKE ALL ON public.user_roles FROM authenticated;
REVOKE ALL ON public.polling_unit_agents FROM authenticated;
REVOKE ALL ON public.councillors FROM authenticated;
REVOKE ALL ON public.lga_chairmen FROM authenticated;
REVOKE ALL ON public.members FROM authenticated;

-- Grant minimal permissions (Policies will handle the rest)
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated; -- Needed for basic role checks if not using RPC
GRANT SELECT ON public.polling_unit_agents TO authenticated;
GRANT SELECT ON public.councillors TO authenticated;
GRANT SELECT ON public.lga_chairmen TO authenticated;
GRANT SELECT ON public.members TO authenticated;

-- Note: INSERT/UPDATE/DELETE should generally be restricted to specific roles via policies, 
-- but we need to grant the underlying permission for the Policy to even apply for those actions.
-- However, for strictly read-only tables for most users, SELECT is safer.
-- We will GRANT ALL to 'authenticated' but rely on RLS to deny it. 
-- Actually, standard Supabase pattern is GRANT ALL TO authenticated and use RLS.
-- The danger was RLS being DISABLED + GRANT ALL.
-- If RLS is ENABLED, GRANT ALL is acceptable provided policies are strict.
-- Let's stick to the standard:
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.polling_unit_agents TO authenticated;
GRANT ALL ON public.councillors TO authenticated;
GRANT ALL ON public.lga_chairmen TO authenticated;
GRANT ALL ON public.members TO authenticated;

-- 3. ENSURE HELPER FUNCTIONS ARE SECURE
-- We redefine them to be absolutely sure they match our security model.

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Runs as Owner (bypass RLS)
SET search_path = public
AS $$
DECLARE
  _role text;
BEGIN
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN _role;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL, _polling_unit text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Only checks READ access logic
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

-- 4. IMPLEMENT STRICT POLICIES

-- === PROFILES ===
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.get_auth_role() IN ('super_admin', 'lga_chairman', 'councillor')); -- Simplified hierarchy visibility

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id);

-- === USER_ROLES ===
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super Admins can manage roles" ON public.user_roles;
CREATE POLICY "Super Admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.get_auth_role() = 'super_admin');

-- === LGA CHAIRMEN ===
DROP POLICY IF EXISTS "Public view for app logic" ON public.lga_chairmen;
-- Sometimes the app needs to list chairmen. Let's allow authenticated to view for now.
CREATE POLICY "Authenticated can view chairmen" ON public.lga_chairmen
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Super Admins manage chairmen" ON public.lga_chairmen;
CREATE POLICY "Super Admins manage chairmen" ON public.lga_chairmen
FOR ALL TO authenticated
USING (public.get_auth_role() = 'super_admin');

-- === COUNCILLORS ===
DROP POLICY IF EXISTS "Authenticated can view councillors" ON public.councillors;
CREATE POLICY "Authenticated can view councillors" ON public.councillors
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Hierarchical manage councillors" ON public.councillors;
CREATE POLICY "Hierarchical manage councillors" ON public.councillors
FOR ALL TO authenticated
USING (
  public.get_auth_role() = 'super_admin' OR
  (public.get_auth_role() = 'lga_chairman' AND lga IN (
    SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid()
  ))
);

-- === POLLING UNIT AGENTS ===
DROP POLICY IF EXISTS "Authenticated can view agents" ON public.polling_unit_agents;
CREATE POLICY "Authenticated can view agents" ON public.polling_unit_agents
FOR SELECT TO authenticated
USING (true); 

DROP POLICY IF EXISTS "Hierarchical manage agents" ON public.polling_unit_agents;
CREATE POLICY "Hierarchical manage agents" ON public.polling_unit_agents
FOR ALL TO authenticated
USING (
  public.get_auth_role() = 'super_admin' OR
  (public.get_auth_role() = 'lga_chairman' AND lga IN (
     SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid()
  )) OR
  (public.get_auth_role() = 'councillor' AND (lga, ward) IN (
     SELECT lga, ward FROM public.councillors WHERE user_id = auth.uid()
  ))
);

-- === MEMBERS (The most critical table) ===
DROP POLICY IF EXISTS "Hierarchical view members" ON public.members;
CREATE POLICY "Hierarchical view members" ON public.members
FOR SELECT TO authenticated
USING (public.check_auth_jurisdiction(lga, ward, polling_unit));

DROP POLICY IF EXISTS "Hierarchical manage members" ON public.members;
CREATE POLICY "Hierarchical manage members" ON public.members
FOR ALL TO authenticated
USING (public.check_auth_jurisdiction(lga, ward, polling_unit))
WITH CHECK (public.check_auth_jurisdiction(lga, ward, polling_unit));

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
