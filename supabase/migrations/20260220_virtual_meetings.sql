-- Create Meeting table
CREATE TABLE IF NOT EXISTS public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    meeting_link TEXT, -- Optional external link, but we use WebRTC by default
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Meeting Invitations table
CREATE TABLE IF NOT EXISTS public.meeting_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(meeting_id, user_id)
);

-- Update messages table to include meeting_id
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES public.meetings(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Meetings
DROP POLICY IF EXISTS "Users can view meetings in their channels" ON public.meetings;
CREATE POLICY "Users can view meetings in their channels" ON public.meetings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = public.meetings.channel_id
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Channel members can create meetings" ON public.meetings;
CREATE POLICY "Channel members can create meetings" ON public.meetings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.channel_members
            WHERE channel_id = public.meetings.channel_id
            AND user_id = auth.uid()
        )
    );

-- RLS Policies for Invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.meeting_invitations;
CREATE POLICY "Users can view their own invitations" ON public.meeting_invitations
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view invitations for meetings they have access to" ON public.meeting_invitations;
CREATE POLICY "Users can view invitations for meetings they have access to" ON public.meeting_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.meetings
            WHERE id = public.meeting_invitations.meeting_id
            AND EXISTS (
                SELECT 1 FROM public.channel_members
                WHERE channel_id = public.meetings.channel_id
                AND user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Users can update their own RSVP status" ON public.meeting_invitations;
CREATE POLICY "Users can update their own RSVP status" ON public.meeting_invitations
    FOR UPDATE USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_meetings_updated_at ON public.meetings;
CREATE TRIGGER set_meetings_updated_at
    BEFORE UPDATE ON public.meetings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_invitations_updated_at ON public.meeting_invitations;
CREATE TRIGGER set_invitations_updated_at
    BEFORE UPDATE ON public.meeting_invitations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
