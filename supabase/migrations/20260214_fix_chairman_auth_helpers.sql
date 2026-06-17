-- ============================================================================
-- FIX AUTH HELPER FUNCTIONS FOR CHAIRMEN AND COUNCILLORS
-- ============================================================================
-- Issue: get_auth_lga() and get_auth_ward() only check profiles table
-- but chairmen data is in lga_chairmen table and councillors in councillors table

-- Fix get_auth_lga to check lga_chairmen and councillors tables
CREATE OR REPLACE FUNCTION public.get_auth_lga()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First check if user is an LGA chairman
    (SELECT lga FROM public.lga_chairmen WHERE user_id = auth.uid()),
    -- Then check if user is a councillor
    (SELECT lga FROM public.councillors WHERE user_id = auth.uid()),
    -- Finally check profiles table (for other users)
    (SELECT lga FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- Fix get_auth_ward to check councillors table
CREATE OR REPLACE FUNCTION public.get_auth_ward()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- First check if user is a councillor
    (SELECT ward FROM public.councillors WHERE user_id = auth.uid()),
    -- Then check profiles table (for other users)
    (SELECT ward FROM public.profiles WHERE id = auth.uid())
  );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_auth_lga() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_ward() TO authenticated;
