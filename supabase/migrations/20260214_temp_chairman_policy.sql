-- ============================================================================
-- TEMPORARY: ADD PERMISSIVE POLICY FOR CHAIRMAN TESTING
-- ============================================================================
-- This adds a simpler policy to test if the issue is with the auth functions
-- or the policy logic itself

-- Add a temporary policy that allows chairmen to see polling units based on profiles.lga
DROP POLICY IF EXISTS "Temp: Chairmen via profiles" ON public.polling_units;
CREATE POLICY "Temp: Chairmen via profiles"
ON public.polling_units
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'lga_chairman'
        AND profiles.lga = polling_units.lga_name
    )
);

-- Also add for councillors table
DROP POLICY IF EXISTS "Temp: Chairmen see councillors via profiles" ON public.councillors;
CREATE POLICY "Temp: Chairmen see councillors via profiles"
ON public.councillors
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'lga_chairman'
        AND profiles.lga = councillors.lga
    )
);
