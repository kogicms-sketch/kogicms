-- ============================================================================
-- FIX RLS RECURSION FOR SUPER ADMIN POLLING UNIT VISIBILITY
-- 
-- Root Cause: The RLS policies checked profiles.role, but the authoritative
-- role source is user_roles table. The super admin had role='member' in
-- profiles but role='super_admin' in user_roles. Additionally, querying
-- profiles inside RLS policies on other tables can cause recursion if
-- profiles also has RLS enabled.
--
-- Fix:
-- 1. Create SECURITY DEFINER helper functions that read from user_roles
-- 2. Recreate all RLS policies to use these helper functions
-- 3. Sync profiles.role from user_roles for consistency
-- ============================================================================

-- Step 1: Create helper functions with SECURITY DEFINER
-- These bypass RLS when called and read from user_roles (authoritative source)

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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

-- Step 2: Drop ALL existing RLS policies on wards, polling_units, polling_unit_cells

-- Wards policies
DROP POLICY IF EXISTS "Allow public read access to wards" ON public.wards;
DROP POLICY IF EXISTS "Super admins can see all wards" ON public.wards;
DROP POLICY IF EXISTS "Chairmen see only their LGA wards" ON public.wards;

-- Polling units policies
DROP POLICY IF EXISTS "Allow public read access to polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Allow authenticated users to manage polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Super admins can see all polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Chairmen see only their LGA polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Super admins can manage all polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Chairmen can manage their LGA polling units" ON public.polling_units;

-- Polling unit cells policies
DROP POLICY IF EXISTS "Allow authenticated users to view polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Allow authenticated users to manage polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Super admins can see all polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Chairmen see only their LGA polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Super admins can manage all polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Chairmen can manage their LGA polling unit cells" ON public.polling_unit_cells;

-- Step 3: Recreate policies using helper functions

-- === WARDS ===
CREATE POLICY "Super admins can see all wards"
ON public.wards FOR SELECT
USING ( get_auth_role() = 'super_admin' );

CREATE POLICY "Chairmen see only their LGA wards"
ON public.wards FOR SELECT
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = (
    SELECT name FROM public.lgas WHERE lgas.id = wards.lga_id
  )
);

-- === POLLING UNITS ===
CREATE POLICY "Super admins can see all polling units"
ON public.polling_units FOR SELECT
USING ( get_auth_role() = 'super_admin' );

CREATE POLICY "Chairmen see only their LGA polling units"
ON public.polling_units FOR SELECT
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = polling_units.lga_name
);

CREATE POLICY "Super admins can manage all polling units"
ON public.polling_units FOR ALL
USING ( get_auth_role() = 'super_admin' );

CREATE POLICY "Chairmen can manage their LGA polling units"
ON public.polling_units FOR ALL
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = polling_units.lga_name
);

-- === POLLING UNIT CELLS ===
CREATE POLICY "Super admins can see all polling unit cells"
ON public.polling_unit_cells FOR SELECT
USING ( get_auth_role() = 'super_admin' );

CREATE POLICY "Chairmen see only their LGA polling unit cells"
ON public.polling_unit_cells FOR SELECT
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = polling_unit_cells.lga
);

CREATE POLICY "Super admins can manage all polling unit cells"
ON public.polling_unit_cells FOR ALL
USING ( get_auth_role() = 'super_admin' );

CREATE POLICY "Chairmen can manage their LGA polling unit cells"
ON public.polling_unit_cells FOR ALL
USING (
  get_auth_role() = 'lga_chairman'
  AND get_auth_lga() = polling_unit_cells.lga
);

-- Step 4: Sync profiles.role for super admin
UPDATE public.profiles
SET role = 'super_admin'
WHERE id IN (
  SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
);
