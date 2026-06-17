-- ============================================================================
-- DIKKO RADDA CAMPAIGN - PHASE 1 MIGRATION
-- Digital Membership & Support Group Management
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE ORGANIZATIONS TABLE (Convert to Support Groups)
-- ============================================================================

-- Add verification and support group specific fields
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'support_group' CHECK (category IN ('support_group', 'party_exco', 'association', 'movement')),
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS verification_notes text,
ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS social_media jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS member_target integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS activity_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_organization_id uuid REFERENCES public.organizations(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_category ON public.organizations(category);
CREATE INDEX IF NOT EXISTS idx_organizations_verification ON public.organizations(verification_status);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON public.organizations(parent_organization_id);

-- ============================================================================
-- 2. ENHANCE MEMBERS TABLE (Recruitment Tracking)
-- ============================================================================

-- Add fields for structure tracking and political positions
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS recruiter_id uuid REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS political_position text CHECK (political_position IN (
    'state_governor', 'state_deputy_governor', 
    'state_party_chairman', 'state_party_secretary', 'state_woman_leader', 'state_youth_leader',
    'senatorial_district_leader', 'federal_constituency_leader',
    'lga_chairman', 'lga_secretary', 'lga_woman_leader', 'lga_youth_leader', 'lga_organizing_secretary',
    'ward_chairman', 'ward_secretary', 'ward_woman_leader', 'ward_youth_leader', 'ward_canvasser',
    'polling_unit_agent', 'polling_unit_canvasser', 'support_group_leader', 'member'
)),
ADD COLUMN IF NOT EXISTS support_group_id uuid REFERENCES public.organizations(id),
ADD COLUMN IF NOT EXISTS nickname text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS whatsapp_number text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS landmark text,
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS tribe text,
ADD COLUMN IF NOT EXISTS education_level text,
ADD COLUMN IF NOT EXISTS employment_status text,
ADD COLUMN IF NOT EXISTS is_volunteer boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_donor boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS contribution_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contacted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS digital_card_url text,
ADD COLUMN IF NOT EXISTS card_generated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS total_recruits integer DEFAULT 0;

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_members_recruiter ON public.members(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_members_support_group ON public.members(support_group_id);
CREATE INDEX IF NOT EXISTS idx_members_political_position ON public.members(political_position);
CREATE INDEX IF NOT EXISTS idx_members_lga_ward ON public.members(lga, ward);

-- ============================================================================
-- 3. CREATE POLITICAL EXCO HIERARCHY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.political_excos (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    level text NOT NULL CHECK (level IN ('state', 'senatorial', 'federal', 'lga', 'ward', 'polling_unit')),
    position text NOT NULL,
    member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
    name text NOT NULL,
    phone text,
    email text,
    state text NOT NULL,
    lga text,
    ward text,
    polling_unit text,
    senatorial_district text,
    federal_constituency text,
    parent_exco_id uuid REFERENCES public.political_excos(id),
    is_active boolean DEFAULT true,
    bio text,
    photo_url text,
    social_media jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_excos_level ON public.political_excos(level);
CREATE INDEX IF NOT EXISTS idx_excos_state ON public.political_excos(state);
CREATE INDEX IF NOT EXISTS idx_excos_lga ON public.political_excos(lga);
CREATE INDEX IF NOT EXISTS idx_excos_ward ON public.political_excos(ward);
CREATE INDEX IF NOT EXISTS idx_excos_parent ON public.political_excos(parent_exco_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_political_excos_updated_at
    BEFORE UPDATE ON public.political_excos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 4. CREATE SUPPORT GROUP ACTIVITIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_group_activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    support_group_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    activity_type text NOT NULL CHECK (activity_type IN ('meeting', 'rally', 'door_to_door', 'market_sensitization', 'motor_park_campaign', 'religious_visit', 'youth_engagement', 'women_forum', 'other')),
    location text NOT NULL,
    lga text,
    ward text,
    activity_date date NOT NULL,
    attendance_count integer DEFAULT 0,
    photos text[] DEFAULT '{}',
    videos text[] DEFAULT '{}',
    impact_notes text,
    verified_by uuid REFERENCES public.profiles(id),
    verified_at timestamp with time zone,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sg_activities_group ON public.support_group_activities(support_group_id);
CREATE INDEX IF NOT EXISTS idx_sg_activities_date ON public.support_group_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_sg_activities_type ON public.support_group_activities(activity_type);

CREATE TRIGGER update_sg_activities_updated_at
    BEFORE UPDATE ON public.support_group_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CREATE MEMBER RECRUITMENT TREE VIEW FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_member_downline(member_uuid uuid)
RETURNS TABLE (
    id uuid,
    full_name text,
    phone text,
    lga text,
    ward text,
    political_position text,
    total_recruits integer,
    joined_at timestamp with time zone,
    level integer
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE downline AS (
        -- Base case: direct recruits
        SELECT 
            m.id,
            m.full_name,
            m.phone,
            m.lga,
            m.ward,
            m.political_position,
            m.total_recruits,
            m.joined_at,
            1 as level
        FROM public.members m
        WHERE m.recruiter_id = member_uuid
        
        UNION ALL
        
        -- Recursive case: recruits of recruits
        SELECT 
            m.id,
            m.full_name,
            m.phone,
            m.lga,
            m.ward,
            m.political_position,
            m.total_recruits,
            m.joined_at,
            d.level + 1
        FROM public.members m
        INNER JOIN downline d ON m.recruiter_id = d.id
        WHERE d.level < 10  -- Limit recursion depth
    )
    SELECT * FROM downline;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. CREATE FUNCTION TO UPDATE RECRUIT COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_member_recruit_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If a new member is being added with a recruiter
    IF TG_OP = 'INSERT' AND NEW.recruiter_id IS NOT NULL THEN
        UPDATE public.members 
        SET total_recruits = total_recruits + 1
        WHERE id = NEW.recruiter_id;
    END IF;
    
    -- If a member is being updated and recruiter changed
    IF TG_OP = 'UPDATE' THEN
        -- Decrement old recruiter count
        IF OLD.recruiter_id IS NOT NULL AND OLD.recruiter_id IS DISTINCT FROM NEW.recruiter_id THEN
            UPDATE public.members 
            SET total_recruits = GREATEST(0, total_recruits - 1)
            WHERE id = OLD.recruiter_id;
        END IF;
        
        -- Increment new recruiter count
        IF NEW.recruiter_id IS NOT NULL AND OLD.recruiter_id IS DISTINCT FROM NEW.recruiter_id THEN
            UPDATE public.members 
            SET total_recruits = total_recruits + 1
            WHERE id = NEW.recruiter_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recruit_count_trigger
    AFTER INSERT OR UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION update_member_recruit_count();

-- ============================================================================
-- 7. CREATE DASHBOARD STATISTICS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_campaign_stats()
RETURNS TABLE (
    total_members bigint,
    total_support_groups bigint,
    verified_support_groups bigint,
    total_excos bigint,
    members_today bigint,
    members_this_week bigint,
    members_this_month bigint,
    top_lgas jsonb,
    top_support_groups jsonb,
    top_recruiters jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.members) as total_members,
        (SELECT COUNT(*) FROM public.organizations WHERE category = 'support_group') as total_support_groups,
        (SELECT COUNT(*) FROM public.organizations WHERE category = 'support_group' AND verification_status = 'verified') as verified_support_groups,
        (SELECT COUNT(*) FROM public.political_excos WHERE is_active = true) as total_excos,
        (SELECT COUNT(*) FROM public.members WHERE created_at >= CURRENT_DATE) as members_today,
        (SELECT COUNT(*) FROM public.members WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as members_this_week,
        (SELECT COUNT(*) FROM public.members WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as members_this_month,
        (
            SELECT jsonb_agg(jsonb_build_object('lga', lga, 'count', cnt))
            FROM (
                SELECT lga, COUNT(*) as cnt
                FROM public.members
                WHERE lga IS NOT NULL
                GROUP BY lga
                ORDER BY cnt DESC
                LIMIT 5
            ) top_lgas
        ) as top_lgas,
        (
            SELECT jsonb_agg(jsonb_build_object('name', name, 'member_count', member_count))
            FROM (
                SELECT name, member_count
                FROM public.organizations
                WHERE category = 'support_group'
                ORDER BY member_count DESC
                LIMIT 5
            ) top_groups
        ) as top_support_groups,
        (
            SELECT jsonb_agg(jsonb_build_object('name', full_name, 'recruits', total_recruits))
            FROM (
                SELECT full_name, total_recruits
                FROM public.members
                WHERE total_recruits > 0
                ORDER BY total_recruits DESC
                LIMIT 5
            ) top_rec
        ) as top_recruiters;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.political_excos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_group_activities ENABLE ROW LEVEL SECURITY;

-- Policies for political_excos
CREATE POLICY "Allow public read access to excos" ON public.political_excos
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create excos" ON public.political_excos
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update excos" ON public.political_excos
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for support_group_activities
CREATE POLICY "Allow public read access to activities" ON public.support_group_activities
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create activities" ON public.support_group_activities
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update activities" ON public.support_group_activities
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================================
-- 9. CREATE TRIGGER TO UPDATE ORGANIZATION MEMBER COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_organization_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.organizations 
        SET member_count = member_count + 1
        WHERE id = NEW.support_group_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.organizations 
        SET member_count = GREATEST(0, member_count - 1)
        WHERE id = OLD.support_group_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.support_group_id IS DISTINCT FROM NEW.support_group_id THEN
            IF OLD.support_group_id IS NOT NULL THEN
                UPDATE public.organizations 
                SET member_count = GREATEST(0, member_count - 1)
                WHERE id = OLD.support_group_id;
            END IF;
            IF NEW.support_group_id IS NOT NULL THEN
                UPDATE public.organizations 
                SET member_count = member_count + 1
                WHERE id = NEW.support_group_id;
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_member_count_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_member_count();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
