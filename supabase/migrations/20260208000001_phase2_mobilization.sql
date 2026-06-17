-- ============================================================================
-- DIKKO RADDA CAMPAIGN - PHASE 2 MIGRATION
-- Event Management, Communication & Polling Unit Cells
-- ============================================================================

-- ============================================================================
-- 1. ENHANCE ACTIVITIES TABLE FOR CAMPAIGN EVENTS
-- ============================================================================

-- Add fields for campaign event management
ALTER TABLE public.activities 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'meeting' 
  CHECK (event_type IN ('rally', 'town_hall', 'door_to_door', 'market_campaign', 'motor_park', 'religious_visit', 'youth_engagement', 'women_forum', 'strategy_meeting', 'other')),
ADD COLUMN IF NOT EXISTS importance text DEFAULT 'normal' 
  CHECK (importance IN ('low', 'normal', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS candidate_attending boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS expected_attendees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_attendees integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS banner_image_url text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_registration boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS meeting_link text,
ADD COLUMN IF NOT EXISTS materials_needed jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logistics_notes text,
ADD COLUMN IF NOT EXISTS security_level text DEFAULT 'standard' 
  CHECK (security_level IN ('standard', 'high', 'maximum')),
ADD COLUMN IF NOT EXISTS broadcast_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS broadcast_sent_at timestamp with time zone;

-- Create indexes for event queries
CREATE INDEX IF NOT EXISTS idx_activities_event_type ON public.activities(event_type);
CREATE INDEX IF NOT EXISTS idx_activities_importance ON public.activities(importance);
CREATE INDEX IF NOT EXISTS idx_activities_candidate ON public.activities(candidate_attending);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(scheduled_date);

-- ============================================================================
-- 2. CREATE TALKING POINTS TABLE (Daily Campaign Ammo)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.talking_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    summary text,
    category text NOT NULL 
      CHECK (category IN ('daily_message', 'achievement', 'policy', 'response', 'mobilization', 'prayer')),
    priority text DEFAULT 'normal' 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    hashtags text[] DEFAULT '{}',
    image_url text,
    video_url text,
    audio_url text,
    is_active boolean DEFAULT true,
    publish_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date,
    target_audience text[] DEFAULT '{}',
    share_count integer DEFAULT 0,
    view_count integer DEFAULT 0,
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_talking_points_category ON public.talking_points(category);
CREATE INDEX IF NOT EXISTS idx_talking_points_active ON public.talking_points(is_active);
CREATE INDEX IF NOT EXISTS idx_talking_points_date ON public.talking_points(publish_date);
CREATE INDEX IF NOT EXISTS idx_talking_points_priority ON public.talking_points(priority);

-- Trigger to update updated_at
CREATE TRIGGER update_talking_points_updated_at
    BEFORE UPDATE ON public.talking_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. CREATE TALKING POINT SHARES TABLE (Track Sharing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.talking_point_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    talking_point_id uuid NOT NULL REFERENCES public.talking_points(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id),
    platform text NOT NULL 
      CHECK (platform IN ('whatsapp', 'facebook', 'twitter', 'instagram', 'telegram', 'copy', 'other')),
    shared_at timestamp with time zone DEFAULT now() NOT NULL,
    recipient_count integer DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tp_shares_point ON public.talking_point_shares(talking_point_id);
CREATE INDEX IF NOT EXISTS idx_tp_shares_user ON public.talking_point_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_tp_shares_date ON public.talking_point_shares(shared_at);

-- Function to increment share count
CREATE OR REPLACE FUNCTION increment_talking_point_share()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.talking_points 
    SET share_count = share_count + 1
    WHERE id = NEW.talking_point_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_share_count_trigger
    AFTER INSERT ON public.talking_point_shares
    FOR EACH ROW
    EXECUTE FUNCTION increment_talking_point_share();

-- ============================================================================
-- 4. CREATE POLLING UNIT CELLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.polling_unit_cells (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    polling_unit_id uuid REFERENCES public.polling_units(id),
    polling_unit_name text NOT NULL,
    ward text NOT NULL,
    lga text NOT NULL,
    state text NOT NULL DEFAULT 'Katsina',
    canvasser_id uuid REFERENCES public.members(id),
    canvasser_name text,
    canvasser_phone text,
    target_voters integer DEFAULT 50,
    registered_voters integer DEFAULT 0,
    reliable_voters integer DEFAULT 0,
    status text DEFAULT 'forming' 
      CHECK (status IN ('forming', 'active', 'mobilizing', 'ready', 'complete')),
    notes text,
    last_visit_date date,
    next_contact_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pu_cells_ward ON public.polling_unit_cells(ward);
CREATE INDEX IF NOT EXISTS idx_pu_cells_lga ON public.polling_unit_cells(lga);
CREATE INDEX IF NOT EXISTS idx_pu_cells_status ON public.polling_unit_cells(status);
CREATE INDEX IF NOT EXISTS idx_pu_cells_canvasser ON public.polling_unit_cells(canvasser_id);

CREATE TRIGGER update_pu_cells_updated_at
    BEFORE UPDATE ON public.polling_unit_cells
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CREATE CELL MEMBERS TABLE (Voters in Each PU Cell)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cell_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    cell_id uuid NOT NULL REFERENCES public.polling_unit_cells(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text,
    voter_id text,
    age_group text 
      CHECK (age_group IN ('18-25', '26-35', '36-45', '46-55', '56-65', '65+')),
    gender text 
      CHECK (gender IN ('male', 'female')),
    occupation text,
    is_reliable boolean DEFAULT false,
    commitment_level text DEFAULT 'interested' 
      CHECK (commitment_level IN ('interested', 'supportive', 'committed', 'champion')),
    notes text,
    contacted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cell_members_cell ON public.cell_members(cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_reliable ON public.cell_members(is_reliable);

-- Function to update cell voter counts
CREATE OR REPLACE FUNCTION update_cell_voter_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.polling_unit_cells 
        SET registered_voters = registered_voters + 1,
            reliable_voters = reliable_voters + CASE WHEN NEW.is_reliable THEN 1 ELSE 0 END
        WHERE id = NEW.cell_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.polling_unit_cells 
        SET registered_voters = GREATEST(0, registered_voters - 1),
            reliable_voters = GREATEST(0, reliable_voters - CASE WHEN OLD.is_reliable THEN 1 ELSE 0 END)
        WHERE id = OLD.cell_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_reliable IS DISTINCT FROM NEW.is_reliable THEN
            UPDATE public.polling_unit_cells 
            SET reliable_voters = reliable_voters + CASE WHEN NEW.is_reliable THEN 1 ELSE -1 END
            WHERE id = NEW.cell_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cell_counts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cell_members
    FOR EACH ROW
    EXECUTE FUNCTION update_cell_voter_counts();

-- ============================================================================
-- 6. CREATE BROADCAST NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.broadcast_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL 
      CHECK (type IN ('general', 'event', 'mobilization', 'urgent', 'celebration', 'prayer')),
    priority text DEFAULT 'normal' 
      CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    target_audience text[] DEFAULT '{}',
    target_lgas text[] DEFAULT '{}',
    target_wards text[] DEFAULT '{}',
    image_url text,
    action_link text,
    action_text text,
    sent_by uuid REFERENCES public.profiles(id),
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_for timestamp with time zone,
    is_sent boolean DEFAULT false,
    recipient_count integer DEFAULT 0,
    read_count integer DEFAULT 0,
    click_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_sent ON public.broadcast_notifications(is_sent);
CREATE INDEX IF NOT EXISTS idx_broadcasts_type ON public.broadcast_notifications(type);
CREATE INDEX IF NOT EXISTS idx_broadcasts_date ON public.broadcast_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled ON public.broadcast_notifications(scheduled_for);

-- ============================================================================
-- 7. CREATE NOTIFICATION RECIPIENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    notification_id uuid NOT NULL REFERENCES public.broadcast_notifications(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id),
    member_id uuid REFERENCES public.members(id),
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    is_clicked boolean DEFAULT false,
    clicked_at timestamp with time zone,
    delivered_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_recip_notification ON public.notification_recipients(notification_id);
CREATE INDEX IF NOT EXISTS idx_notif_recip_user ON public.notification_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_recip_read ON public.notification_recipients(is_read);

-- Function to track notification reads
CREATE OR REPLACE FUNCTION track_notification_read()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_read AND NOT OLD.is_read THEN
        UPDATE public.broadcast_notifications 
        SET read_count = read_count + 1
        WHERE id = NEW.notification_id;
    END IF;
    IF NEW.is_clicked AND NOT OLD.is_clicked THEN
        UPDATE public.broadcast_notifications 
        SET click_count = click_count + 1
        WHERE id = NEW.notification_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_notif_read_trigger
    AFTER UPDATE ON public.notification_recipients
    FOR EACH ROW
    EXECUTE FUNCTION track_notification_read();

-- ============================================================================
-- 8. CREATE MATERIAL REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.material_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    event_id uuid REFERENCES public.activities(id),
    support_group_id uuid REFERENCES public.organizations(id),
    requester_id uuid REFERENCES public.members(id),
    requester_name text NOT NULL,
    requester_phone text NOT NULL,
    lga text NOT NULL,
    ward text,
    event_location text,
    event_date date,
    materials jsonb NOT NULL DEFAULT '{}',
    -- e.g., {"t_shirts": 100, "caps": 100, "banners": 5, "stickers": 1000}
    status text DEFAULT 'pending' 
      CHECK (status IN ('pending', 'approved', 'partial', 'fulfilled', 'rejected')),
    notes text,
    approved_by uuid REFERENCES public.profiles(id),
    approved_at timestamp with time zone,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_material_req_status ON public.material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_req_event ON public.material_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_material_req_lga ON public.material_requests(lga);

CREATE TRIGGER update_material_req_updated_at
    BEFORE UPDATE ON public.material_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 9. CREATE CAMPAIGN CALENDAR VIEW
-- ============================================================================

CREATE OR REPLACE VIEW campaign_calendar AS
SELECT 
    a.id,
    a.title,
    a.event_type as type,
    a.scheduled_date as date,
    a.start_time,
    a.end_time,
    a.location,
    a.lga,
    a.ward,
    a.importance,
    a.candidate_attending,
    a.expected_attendees,
    a.actual_attendees,
    a.status,
    a.banner_image_url,
    a.is_public,
    COUNT(aa.id) as registered_attendees
FROM public.activities a
LEFT JOIN public.activity_attendance aa ON aa.activity_id = a.id
GROUP BY a.id
ORDER BY a.scheduled_date, a.start_time;

-- ============================================================================
-- 10. CREATE MOBILIZATION STATS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mobilization_stats()
RETURNS TABLE (
    total_events bigint,
    upcoming_events bigint,
    total_attendees bigint,
    total_pu_cells bigint,
    active_cells bigint,
    total_registered_voters bigint,
    total_reliable_voters bigint,
    cells_meeting_target bigint,
    total_broadcasts bigint,
    total_talking_points bigint,
    active_talking_points bigint,
    material_requests_pending bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM public.activities WHERE event_type IS NOT NULL) as total_events,
        (SELECT COUNT(*) FROM public.activities WHERE scheduled_date >= CURRENT_DATE) as upcoming_events,
        (SELECT COALESCE(SUM(actual_attendees), 0) FROM public.activities) as total_attendees,
        (SELECT COUNT(*) FROM public.polling_unit_cells) as total_pu_cells,
        (SELECT COUNT(*) FROM public.polling_unit_cells WHERE status IN ('active', 'mobilizing', 'ready')) as active_cells,
        (SELECT COALESCE(SUM(registered_voters), 0) FROM public.polling_unit_cells) as total_registered_voters,
        (SELECT COALESCE(SUM(reliable_voters), 0) FROM public.polling_unit_cells) as total_reliable_voters,
        (SELECT COUNT(*) FROM public.polling_unit_cells WHERE reliable_voters >= target_voters) as cells_meeting_target,
        (SELECT COUNT(*) FROM public.broadcast_notifications WHERE is_sent = true) as total_broadcasts,
        (SELECT COUNT(*) FROM public.talking_points) as total_talking_points,
        (SELECT COUNT(*) FROM public.talking_points WHERE is_active = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)) as active_talking_points,
        (SELECT COUNT(*) FROM public.material_requests WHERE status = 'pending') as material_requests_pending;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.talking_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talking_point_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_unit_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cell_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- Policies for talking_points (public read, auth write)
CREATE POLICY "Allow public read access to talking points" ON public.talking_points
    FOR SELECT USING (is_active = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));

CREATE POLICY "Allow authenticated users to create talking points" ON public.talking_points
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update talking points" ON public.talking_points
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policies for polling_unit_cells
CREATE POLICY "Allow public read access to cells" ON public.polling_unit_cells
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage cells" ON public.polling_unit_cells
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for cell_members
CREATE POLICY "Allow public read access to cell members" ON public.cell_members
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage cell members" ON public.cell_members
    FOR ALL USING (auth.role() = 'authenticated');

-- Policies for broadcasts
CREATE POLICY "Allow public read access to broadcasts" ON public.broadcast_notifications
    FOR SELECT USING (is_sent = true);

CREATE POLICY "Allow authenticated users to create broadcasts" ON public.broadcast_notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policies for material_requests
CREATE POLICY "Allow public read access to material requests" ON public.material_requests
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage material requests" ON public.material_requests
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
