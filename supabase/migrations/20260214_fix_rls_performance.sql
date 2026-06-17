-- ============================================================================
-- FINAL PERFORMANCE FIX FOR RLS AND SCHEMA QUERY ERRORS
-- ============================================================================

-- Step 1: Optimize helper functions to be STABLE and SQL-based
-- This allows Postgres to cache the results per-transaction/query, 
-- massively improving performance on big tables like polling_units.

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Prioritize user_roles as authoritative, fallback to profiles if needed
  -- Both are queried with SECURITY DEFINER (bypass RLS)
  SELECT COALESCE(
    (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid()),
    (SELECT role::text FROM public.profiles WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.get_auth_lga()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lga FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_ward()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ward FROM public.profiles WHERE id = auth.uid();
$$;

-- Step 2: Fix profiles table policies to avoid recursion
-- We use direct user_roles check for admin/chairman access on the profiles table
-- instead of get_auth_role() which queries profiles itself.

DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "LGA chairmen can view profiles" ON public.profiles;

CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "LGA chairmen can view profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'lga_chairman'
  )
);

-- Step 3: Refresh all high-traffic table policies to use STABLE functions
-- This ensures the STABLE property is respected by existing policies.

-- (The existing policies already call these functions, but refreshing the functions 
-- with STABLE and SQL language is usually enough. However, we'll re-apply critical ones
-- to be absolutely sure).

-- Polling Units
DROP POLICY IF EXISTS "Super admins can see all polling units" ON public.polling_units;
CREATE POLICY "Super admins can see all polling units"
ON public.polling_units FOR SELECT
USING ( get_auth_role() = 'super_admin' );

DROP POLICY IF EXISTS "Chairmen see only their LGA polling units" ON public.polling_units;
CREATE POLICY "Chairmen see only their LGA polling units"
ON public.polling_units FOR SELECT
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = polling_units.lga_name
);

-- Members
DROP POLICY IF EXISTS "Super admins can view all members" ON public.members;
CREATE POLICY "Super admins can view all members"
ON public.members FOR SELECT
USING ( get_auth_role() = 'super_admin' );

DROP POLICY IF EXISTS "LGA Chairmen can view their LGA members" ON public.members;
CREATE POLICY "LGA Chairmen can view their LGA members"
ON public.members FOR SELECT
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = lga
);

-- Ensure RLS is active
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
