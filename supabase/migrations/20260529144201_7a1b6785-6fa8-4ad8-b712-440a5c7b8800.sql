CREATE TABLE public.election_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_type TEXT NOT NULL,
  lga TEXT NOT NULL,
  ward TEXT,
  polling_unit_code TEXT,
  polling_unit_name TEXT NOT NULL,
  votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  registered_voters INTEGER NOT NULL DEFAULT 0,
  accredited_voters INTEGER NOT NULL DEFAULT 0,
  result_sheet_url TEXT,
  agent_user_id TEXT,
  agent_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (polling_unit_name, lga, race_type)
);

CREATE INDEX idx_election_results_race ON public.election_results (race_type);
CREATE INDEX idx_election_results_lga ON public.election_results (lga);

GRANT SELECT, INSERT ON public.election_results TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.election_results TO authenticated;
GRANT ALL ON public.election_results TO service_role;

ALTER TABLE public.election_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Results are publicly viewable"
ON public.election_results FOR SELECT
USING (true);

CREATE POLICY "Anyone can submit results"
ON public.election_results FOR INSERT
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_election_results_updated_at
BEFORE UPDATE ON public.election_results
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.election_results;
ALTER TABLE public.election_results REPLICA IDENTITY FULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('result-sheets', 'result-sheets', true);

CREATE POLICY "Result sheets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'result-sheets');

CREATE POLICY "Anyone can upload result sheets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'result-sheets');