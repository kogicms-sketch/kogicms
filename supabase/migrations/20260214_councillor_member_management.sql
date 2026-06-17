-- ============================================================================
-- FINAL STRICT JURISDICTIONAL RLS & VISIBILITY FIX
-- ============================================================================

-- 1. Fix Councillor & Chairman self-view (CRITICAL for subqueries)
ALTER TABLE public.councillors DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Councillors can view own record" ON public.councillors;
DROP POLICY IF EXISTS "Super admins can view all councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can view their councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can create councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can update their councillors" ON public.councillors;

CREATE POLICY "Councillors can view own record" ON public.councillors FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins full access" ON public.councillors FOR ALL TO authenticated USING (public.auth_is_super_admin());
CREATE POLICY "Chairmen manage their councillors" ON public.councillors FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = councillors.lga));
ALTER TABLE public.councillors ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.lga_chairmen DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chairmen can view own record" ON public.lga_chairmen;
DROP POLICY IF EXISTS "Super admins can view all chairmen" ON public.lga_chairmen;
CREATE POLICY "Chairmen can view own record" ON public.lga_chairmen FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Super admins full access" ON public.lga_chairmen FOR ALL TO authenticated USING (public.auth_is_super_admin());
ALTER TABLE public.lga_chairmen ENABLE ROW LEVEL SECURITY;

-- 2. Robust Jurisdictional Check Function (Security Definer)
CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = _lga AND (ward = _ward OR _ward IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = _lga
  );
$$;

-- 3. Reset and Apply Strict Members RLS
ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can view members" ON public.members;
DROP POLICY IF EXISTS "Org admins can manage their org members" ON public.members;
DROP POLICY IF EXISTS "Super admins can manage all members" ON public.members;
DROP POLICY IF EXISTS "Chairmen manage members in their LGA" ON public.members;
DROP POLICY IF EXISTS "Councillors manage members in their ward" ON public.members;
DROP POLICY IF EXISTS "Personnel manage members in their jurisdiction" ON public.members;

-- [Admin Overrides]
CREATE POLICY "Admins manage all" ON public.members FOR ALL TO authenticated 
USING (public.auth_is_super_admin() OR public.is_org_admin(auth.uid(), organization_id));

-- [Strict Jurisdiction]
-- This ensures councillors only see members in their ward, and chairmen in their LGA
CREATE POLICY "Jurisdictional filtered access" ON public.members FOR ALL TO authenticated
USING (public.check_auth_jurisdiction(lga, ward))
WITH CHECK (public.check_auth_jurisdiction(lga, ward));

-- [Creator Override]
-- Always allow the creator to see/manage their entry (backup)
CREATE POLICY "Creator manage own" ON public.members FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- 4. Ensure organization_id is nullable (Backup)
ALTER TABLE public.members ALTER COLUMN organization_id DROP NOT NULL;
