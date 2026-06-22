-- Update INSERT policy on incentive_batches
DROP POLICY IF EXISTS "Authorized roles can insert incentive batches" ON public.incentive_batches;
CREATE POLICY "Authorized roles can insert incentive batches" ON public.incentive_batches
    FOR INSERT TO authenticated
    WITH CHECK (
        get_auth_role() IN ('super_admin', 'senatorial_leader', 'federal_rep', 'house_assembly_member', 'lga_chairman', 'org_admin')
    );

-- Drop old material_requests policies
DROP POLICY IF EXISTS "Admins manage material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Allow public read access to material requests" ON public.material_requests;
DROP POLICY IF EXISTS "Allow authenticated users to manage material requests" ON public.material_requests;

-- Allow authenticated users to view material requests
CREATE POLICY "Allow authenticated users to view material requests" ON public.material_requests
    FOR SELECT TO authenticated
    USING (true);

-- Allow support groups and admins to insert material requests
CREATE POLICY "Allow support groups and admins to insert material requests" ON public.material_requests
    FOR INSERT TO authenticated
    WITH CHECK (
        get_auth_role() IN ('super_admin', 'org_admin')
    );

-- Allow support groups, candidates, and admins to update material requests
CREATE POLICY "Allow support groups, candidates, and admins to update material requests" ON public.material_requests
    FOR UPDATE TO authenticated
    USING (
        get_auth_role() IN ('super_admin', 'org_admin', 'senatorial_leader', 'federal_rep', 'house_assembly_member')
    );

NOTIFY pgrst, 'reload schema';
