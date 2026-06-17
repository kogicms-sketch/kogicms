-- ============================================================================
-- ADD CHAIRMAN ACCESS TO MEMBERS TABLE
-- ============================================================================

-- Add policy that allows chairmen to see members in their LGA
DROP POLICY IF EXISTS "Temp: Chairmen see members via profiles" ON public.members;
CREATE POLICY "Temp: Chairmen see members via profiles"
ON public.members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'lga_chairman'
        AND profiles.lga = members.lga
    )
);

-- Also allow chairmen to manage (insert/update/delete) members in their LGA
DROP POLICY IF EXISTS "Temp: Chairmen manage members via profiles" ON public.members;
CREATE POLICY "Temp: Chairmen manage members via profiles"
ON public.members
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'lga_chairman'
        AND profiles.lga = members.lga
    )
);
