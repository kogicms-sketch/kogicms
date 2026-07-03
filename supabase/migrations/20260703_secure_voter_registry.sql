-- Migration: Secure voter_registry with Row Level Security (RLS)
ALTER TABLE public.voter_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read of voter registry" ON public.voter_registry;
CREATE POLICY "Allow authenticated read of voter registry" ON public.voter_registry FOR SELECT TO authenticated USING (true);
