-- ============================================================================
-- FINAL RECURSION BREAKER: SECURITY DEFINER FUNCTIONS
-- ============================================================================

-- Step 1: Create dedicated SECURITY DEFINER functions for role checks
-- These bypass RLS completely to avoid recursion loops

CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_lga_chairman()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'lga_chairman'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_is_councillor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'councillor'
  );
$$;

-- Step 2: Fix user_roles policies (Root of recursion)
DROP POLICY IF EXISTS "Super admins can manage all roles" ON public.user_roles;
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING ( public.auth_is_super_admin() );

-- Step 3: Fix profiles policies
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "LGA chairmen can view profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING ( public.auth_is_super_admin() );

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING ( public.auth_is_super_admin() );

CREATE POLICY "LGA chairmen can view profiles"
ON public.profiles FOR SELECT
USING ( public.auth_is_lga_chairman() );

-- Step 4: Fix councillors policies (Specific fix for user issue)
-- Drop existing policies that might be recursive
DROP POLICY IF EXISTS "Super admins can view all councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can view their councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can create councillors" ON public.councillors;
DROP POLICY IF EXISTS "Chairmen can update their councillors" ON public.councillors;

-- Re-create with safe functions
CREATE POLICY "Super admins can view all councillors" ON public.councillors
FOR SELECT TO authenticated
USING ( public.auth_is_super_admin() );

CREATE POLICY "Chairmen can view their councillors" ON public.councillors
FOR SELECT TO authenticated
USING (
    public.auth_is_lga_chairman() 
    AND lga = (SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid())
);

CREATE POLICY "Chairmen can create councillors" ON public.councillors
FOR INSERT TO authenticated
WITH CHECK (
    public.auth_is_lga_chairman()
    AND lga = (SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid())
);

CREATE POLICY "Chairmen can update their councillors" ON public.councillors
FOR UPDATE TO authenticated
USING (
    public.auth_is_lga_chairman()
    AND lga = (SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid())
)
WITH CHECK (
    public.auth_is_lga_chairman()
    AND lga = (SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid())
);

-- Step 5: Update get_auth_role to use safe functions
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN public.auth_is_super_admin() THEN 'super_admin'
    WHEN public.auth_is_lga_chairman() THEN 'lga_chairman'
    WHEN public.auth_is_councillor() THEN 'councillor'
    ELSE (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid())
  END;
$$;
