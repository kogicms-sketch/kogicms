-- ============================================================================
-- MIGRATION: SUPPORT GROUP CANDIDATE ALIGNMENT & ROUTING
-- ============================================================================

-- 1. Extend organizations table for Candidate Alignment and Constituencies
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS candidate_race TEXT CHECK (candidate_race IN ('governorship', 'senatorial', 'house_of_reps', 'state_assembly')),
  ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS senatorial_zone TEXT,
  ADD COLUMN IF NOT EXISTS federal_constituency TEXT;

-- Create indices for leaderboard speed
CREATE INDEX IF NOT EXISTS idx_organizations_candidate_id ON public.organizations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_organizations_kpi_score ON public.organizations(kpi_score DESC);

-- 2. Extend incentive_batches table for Support Group targeting
ALTER TABLE public.incentive_batches
  ADD COLUMN IF NOT EXISTS target_support_group_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incentive_batches_target_sg ON public.incentive_batches(target_support_group_id);

-- 3. Update RLS policies for incentive_batches
DROP POLICY IF EXISTS "Funder and executors can update incentive batches" ON public.incentive_batches;
CREATE POLICY "Funder and executors can update incentive batches" ON public.incentive_batches
    FOR UPDATE TO authenticated
    USING (
        get_auth_role() = 'super_admin' OR
        funder_id = auth.uid() OR
        (get_auth_role() = 'councillor' AND target_ward = get_auth_ward() AND target_lga = get_auth_lga()) OR
        (get_auth_role() = 'lga_chairman' AND target_lga = get_auth_lga()) OR
        (EXISTS (
            SELECT 1 FROM public.organization_admins oa
            WHERE oa.organization_id = target_support_group_id AND oa.user_id = auth.uid()
        ))
    );

-- 4. Update RLS policies for member_incentives
DROP POLICY IF EXISTS "Councillors and admins can manage member incentives" ON public.member_incentives;
CREATE POLICY "Councillors and admins can manage member incentives" ON public.member_incentives
    FOR ALL TO authenticated
    USING (
        get_auth_role() = 'super_admin' OR
        (get_auth_role() = 'councillor' AND EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_id AND m.lga = get_auth_lga() AND m.ward = get_auth_ward()
        )) OR
        EXISTS (
            SELECT 1 FROM public.incentive_batches ib
            JOIN public.organization_admins oa ON oa.organization_id = ib.target_support_group_id
            WHERE ib.id = batch_id AND oa.user_id = auth.uid()
        )
    );

-- Reload Schema
NOTIFY pgrst, 'reload schema';
