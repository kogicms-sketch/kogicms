-- ============================================================================
-- IMPLEMENT ROLE-BASED ACCESS CONTROL
-- Ensures LGA chairmen only see their LGA's data, super admins see all data
-- ============================================================================

-- Step 1: Add LGA column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lga text;

COMMENT ON COLUMN public.profiles.lga IS 'LGA assignment for chairmen - used for data filtering';

-- Step 2: Populate LGA for all 34 chairmen based on email pattern
UPDATE public.profiles
SET lga = CASE
  WHEN email LIKE '%bakoricms%' THEN 'Bakori'
  WHEN email LIKE '%batagarawacms%' THEN 'Batagarawa'
  WHEN email LIKE '%bindawacms%' THEN 'Bindawa'
  WHEN email LIKE '%charanchi%' THEN 'Charanchi'
  WHEN email LIKE '%dandumecms%' THEN 'Dandume'
  WHEN email LIKE '%dankanicms%' THEN 'Dankani'
  WHEN email LIKE '%danmusacms%' THEN 'Dan Musa'
  WHEN email LIKE '%dauracms%' THEN 'Daura'
  WHEN email LIKE '%dutsin-macms%' THEN 'Dutsin-Ma'
  WHEN email LIKE '%dutsi%' THEN 'Dutsi'
  WHEN email LIKE '%fastucms%' THEN 'Faskari'
  WHEN email LIKE '%funtuacms%' THEN 'Funtua'
  WHEN email LIKE '%ingawacms%' THEN 'Ingawa'
  WHEN email LIKE '%jibiyacms%' THEN 'Jibia'
  WHEN email LIKE '%kafurcms%' THEN 'Kafur'
  WHEN email LIKE '%kanjilocms%' THEN 'Kankara'
  WHEN email LIKE '%kankiacms%' THEN 'Kankia'
  WHEN email LIKE '%katsina%cms%' THEN 'Katsina'
  WHEN email LIKE '%kurdancms%' THEN 'Kurfi'
  WHEN email LIKE '%kusadacms%' THEN 'Kusada'
  WHEN email LIKE '%maiaduwacms%' THEN 'Mai''Adua'
  WHEN email LIKE '%malamadori%' THEN 'Malam Madori'
  WHEN email LIKE '%manicms%' THEN 'Mani'
  WHEN email LIKE '%masacms%' THEN 'Mashi'
  WHEN email LIKE '%matazucms%' THEN 'Matazu'
  WHEN email LIKE '%musawacms%' THEN 'Musawa'
  WHEN email LIKE '%rimicms%' THEN 'Rimi'
  WHEN email LIKE '%sabuwa%' THEN 'Sabuwa'
  WHEN email LIKE '%safanacms%' THEN 'Safana'
  WHEN email LIKE '%sandamucms%' THEN 'Sandamu'
  WHEN email LIKE '%zangocms%' THEN 'Zango'
  WHEN email LIKE '%jibiyacms%' THEN 'Jibia'
  WHEN email LIKE '%batsaricms%' THEN 'Batsari'
  WHEN email LIKE '%kajilocms%' THEN 'Kankara'
END
WHERE role = 'lga_chairman' AND lga IS NULL;

-- Verify the update
DO $$
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM public.profiles
    WHERE role = 'lga_chairman' AND lga IS NOT NULL;
    
    RAISE NOTICE '% chairman profiles updated with LGA assignments', updated_count;
END $$;

-- Step 3: Drop old permissive RLS policies
DROP POLICY IF EXISTS "Allow public read access to wards" ON public.wards;
DROP POLICY IF EXISTS "Allow public read access to polling units" ON public.polling_units;
DROP POLICY IF EXISTS "Allow authenticated users to manage polling units" ON public.polling_units;

-- Step 4: Create RLS policies for WARDS table
-- Super admins see all wards
CREATE POLICY "Super admins can see all wards"
ON public.wards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Chairmen see only their LGA's wards
CREATE POLICY "Chairmen see only their LGA wards"
ON public.wards FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles  
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lga_chairman'
    AND profiles.lga = (
      SELECT name FROM public.lgas WHERE lgas.id = wards.lga_id
    )
  )
);

-- Step 5: Create RLS policies for POLLING_UNITS table
-- Super admins see all polling units
CREATE POLICY "Super admins can see all polling units"
ON public.polling_units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Chairmen see only their LGA's polling units
CREATE POLICY "Chairmen see only their LGA polling units"
ON public.polling_units FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lga_chairman'
    AND profiles.lga = polling_units.lga_name
  )
);

-- Super admins can manage all polling units
CREATE POLICY "Super admins can manage all polling units"
ON public.polling_units FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Chairmen can manage their LGA's polling units
CREATE POLICY "Chairmen can manage their LGA polling units"
ON public.polling_units FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lga_chairman'
    AND profiles.lga = polling_units.lga_name
  )
);

-- Step 6: Create RLS policies for POLLING_UNIT_CELLS table
-- Drop any existing policies
DROP POLICY IF EXISTS "Allow authenticated users to view polling unit cells" ON public.polling_unit_cells;
DROP POLICY IF EXISTS "Allow authenticated users to manage polling unit cells" ON public.polling_unit_cells;

-- Super admins see all polling unit cells
CREATE POLICY "Super admins can see all polling unit cells"
ON public.polling_unit_cells FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Chairmen see only their LGA's polling unit cells
CREATE POLICY "Chairmen see only their LGA polling unit cells"
ON public.polling_unit_cells FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lga_chairman'
    AND profiles.lga = polling_unit_cells.lga
  )
);

-- Super admins can manage all polling unit cells
CREATE POLICY "Super admins can manage all polling unit cells"
ON public.polling_unit_cells FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Chairmen can manage their LGA's polling unit cells
CREATE POLICY "Chairmen can manage their LGA polling unit cells"
ON public.polling_unit_cells FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'lga_chairman'
    AND profiles.lga = polling_unit_cells.lga
  )
);

-- Final verification
DO $$
DECLARE
    chairmen_count integer;
    wards_count integer;
    polling_units_count integer;
BEGIN
    -- Count chairmen with LGA assigned
    SELECT COUNT(*) INTO chairmen_count
    FROM public.profiles
    WHERE role = 'lga_chairman' AND lga IS NOT NULL;
    
    -- Count total wards
    SELECT COUNT(*) INTO wards_count FROM public.wards;
    
    -- Count total polling units
    SELECT COUNT(*) INTO polling_units_count FROM public.polling_units;
    
    RAISE NOTICE '=== Role-Based Access Control Applied ===';
    RAISE NOTICE 'Chairmen with LGA assignment: %', chairmen_count;
    RAISE NOTICE 'Total wards: %', wards_count;
    RAISE NOTICE 'Total polling units: %', polling_units_count;
    RAISE NOTICE '==========================================';
    
    IF chairmen_count >= 34 THEN
        RAISE NOTICE '✓ All chairmen are assigned to their LGAs!';
    ELSE
        RAISE WARNING '⚠ Only % out of 34 chairmen have LGA assignments', chairmen_count;
    END IF;
END $$;
