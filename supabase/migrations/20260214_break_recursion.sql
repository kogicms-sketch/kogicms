-- ============================================================================
-- FINAL BREAKTHROUGH FIX: BREAK ALL RLS RECURSION LOOPS
-- ============================================================================

-- Step 1: Fix user_roles RECURSION
-- The old policy used: SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin'
-- This is circular. We MUST use a SECURITY DEFINER function instead.

DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING ( (SELECT public.get_auth_role()) = 'super_admin' );

-- Step 2: Fix organization_admins RECURSION
DROP POLICY IF EXISTS "Super admins can manage org admins" ON public.organization_admins;
CREATE POLICY "Super admins can manage org admins"
ON public.organization_admins FOR ALL
USING ( (SELECT public.get_auth_role()) = 'super_admin' );

-- Step 3: Refresh profiles policies to be clean
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "LGA chairmen can view profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING ( (SELECT public.get_auth_role()) = 'super_admin' );

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING ( (SELECT public.get_auth_role()) = 'super_admin' );

CREATE POLICY "LGA chairmen can view profiles"
ON public.profiles FOR SELECT
USING ( (SELECT public.get_auth_role()) = 'lga_chairman' );

-- Step 4: Redefine has_role to be absolute and stable
-- This replaces direct role checks in other tables to ensure performance.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- Step 5: Final sync of profiles roles
-- Ensure the denormalized role matches the authoritative one
UPDATE public.profiles p
SET role = r.role::text::app_role
FROM public.user_roles r
WHERE p.id = r.user_id;

-- Ensure RLS is active and cache is flushed
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
