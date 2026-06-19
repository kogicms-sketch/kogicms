-- ============================================================================
-- WELFARE & INCENTIVE DISTRIBUTION SYSTEM
-- Migration: 20260619_create_welfare_distribution_system.sql
-- ============================================================================

-- 1. Create incentive_batches table
CREATE TABLE IF NOT EXISTS public.incentive_batches (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'material', 'grant', 'other')),
    item_name TEXT NOT NULL, -- e.g., "Scholarship Grant", "Rice Bag"
    amount_per_member NUMERIC(15, 2) DEFAULT 0, -- for cash/financial incentives
    total_packages INTEGER NOT NULL CHECK (total_packages > 0),
    allocated_packages INTEGER DEFAULT 0 CHECK (allocated_packages >= 0),
    disbursed_packages INTEGER DEFAULT 0 CHECK (disbursed_packages >= 0),
    funder_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    funder_name TEXT NOT NULL,
    funder_role TEXT NOT NULL, -- e.g., 'super_admin', 'senatorial_leader', 'federal_rep', 'house_assembly_member', 'lga_chairman'
    target_lga TEXT, -- Can be NULL for global
    target_ward TEXT, -- Can be NULL for LGA-wide
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_incentive_batches_target_lga ON public.incentive_batches(target_lga);
CREATE INDEX IF NOT EXISTS idx_incentive_batches_target_ward ON public.incentive_batches(target_ward);

-- 2. Create member_incentives table
CREATE TABLE IF NOT EXISTS public.member_incentives (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    batch_id uuid REFERENCES public.incentive_batches(id) ON DELETE CASCADE NOT NULL,
    member_id uuid REFERENCES public.members(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'allocated' CHECK (status IN ('allocated', 'disbursed')),
    allocated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    disbursed_at TIMESTAMPTZ,
    disbursed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    disbursed_by_name TEXT,
    phone_number TEXT, -- phone number of recipient at time of disbursement
    audit_status TEXT DEFAULT 'pending' CHECK (audit_status IN ('pending', 'verified', 'flagged')),
    audit_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    audit_at TIMESTAMPTZ,
    audit_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE (batch_id, member_id) -- A member can receive only one package from a specific batch
);

CREATE INDEX IF NOT EXISTS idx_member_incentives_member ON public.member_incentives(member_id);
CREATE INDEX IF NOT EXISTS idx_member_incentives_batch ON public.member_incentives(batch_id);

-- 3. Enable RLS
ALTER TABLE public.incentive_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_incentives ENABLE ROW LEVEL SECURITY;

-- 4. Grant access to authenticated users
GRANT ALL ON public.incentive_batches TO authenticated;
GRANT ALL ON public.member_incentives TO authenticated;

-- 5. RLS Policies

-- incentive_batches policies
DROP POLICY IF EXISTS "Authenticated users can view all incentive batches" ON public.incentive_batches;
CREATE POLICY "Authenticated users can view all incentive batches" ON public.incentive_batches
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authorized roles can insert incentive batches" ON public.incentive_batches;
CREATE POLICY "Authorized roles can insert incentive batches" ON public.incentive_batches
    FOR INSERT TO authenticated
    WITH CHECK (
        get_auth_role() IN ('super_admin', 'senatorial_leader', 'federal_rep', 'house_assembly_member', 'lga_chairman')
    );

DROP POLICY IF EXISTS "Funder and executors can update incentive batches" ON public.incentive_batches;
CREATE POLICY "Funder and executors can update incentive batches" ON public.incentive_batches
    FOR UPDATE TO authenticated
    USING (
        get_auth_role() = 'super_admin' OR
        funder_id = auth.uid() OR
        (get_auth_role() = 'councillor' AND target_ward = get_auth_ward() AND target_lga = get_auth_lga()) OR
        (get_auth_role() = 'lga_chairman' AND target_lga = get_auth_lga())
    );

DROP POLICY IF EXISTS "Funder and admins can delete incentive batches" ON public.incentive_batches;
CREATE POLICY "Funder and admins can delete incentive batches" ON public.incentive_batches
    FOR DELETE TO authenticated
    USING (
        get_auth_role() = 'super_admin' OR funder_id = auth.uid()
    );

-- member_incentives policies
DROP POLICY IF EXISTS "Authenticated users can view member incentives" ON public.member_incentives;
CREATE POLICY "Authenticated users can view member incentives" ON public.member_incentives
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Councillors and admins can manage member incentives" ON public.member_incentives;
CREATE POLICY "Councillors and admins can manage member incentives" ON public.member_incentives
    FOR ALL TO authenticated
    USING (
        get_auth_role() = 'super_admin' OR
        (get_auth_role() = 'councillor' AND EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_id AND m.lga = get_auth_lga() AND m.ward = get_auth_ward()
        ))
    );

-- 6. Triggers for updated_at
CREATE TRIGGER update_incentive_batches_updated_at
    BEFORE UPDATE ON public.incentive_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_incentives_updated_at
    BEFORE UPDATE ON public.member_incentives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Reload schema
NOTIFY pgrst, 'reload schema';
