-- SQL Migration: Create live_streams table and configure RLS and Realtime sync.

CREATE TABLE IF NOT EXISTS public.live_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    agent_name TEXT NOT NULL,
    polling_unit_id TEXT,
    polling_unit_code TEXT,
    polling_unit_name TEXT,
    ward TEXT NOT NULL,
    lga TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated read of live streams" ON public.live_streams;
CREATE POLICY "Allow authenticated read of live streams" 
ON public.live_streams FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow agent insert of own live stream" ON public.live_streams;
CREATE POLICY "Allow agent insert of own live stream" 
ON public.live_streams FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Allow agent update of own live stream" ON public.live_streams;
CREATE POLICY "Allow agent update of own live stream" 
ON public.live_streams FOR UPDATE TO authenticated USING (auth.uid() = agent_id) WITH CHECK (auth.uid() = agent_id);

DROP POLICY IF EXISTS "Allow agent delete of own live stream" ON public.live_streams;
CREATE POLICY "Allow agent delete of own live stream" 
ON public.live_streams FOR DELETE TO authenticated USING (auth.uid() = agent_id);

-- Enable Realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
