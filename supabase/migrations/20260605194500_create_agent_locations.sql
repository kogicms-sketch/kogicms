-- Create agent_locations table
CREATE TABLE IF NOT EXISTS public.agent_locations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_name text NOT NULL,
    lga text NOT NULL,
    ward text NOT NULL,
    polling_unit_name text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for querying history
CREATE INDEX IF NOT EXISTS idx_agent_locations_query ON public.agent_locations(agent_user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.agent_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow select on agent_locations" ON public.agent_locations;
DROP POLICY IF EXISTS "Allow insert on agent_locations" ON public.agent_locations;

-- Create policies
CREATE POLICY "Allow select on agent_locations" ON public.agent_locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert on agent_locations" ON public.agent_locations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_user_id);
