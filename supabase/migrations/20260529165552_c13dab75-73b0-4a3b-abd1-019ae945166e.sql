-- Voter registry table (INEC Wakilin Kudu II ward, PUs 1-10)
CREATE TABLE public.voter_registry (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vin text NOT NULL UNIQUE,
  full_name text NOT NULL,
  dob_year integer,
  gender text,
  lga text,
  ward text,
  polling_unit_code text,
  polling_unit_name text,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes for fast lookup by VIN and name search
CREATE INDEX idx_voter_registry_vin ON public.voter_registry (vin);
CREATE INDEX idx_voter_registry_name ON public.voter_registry USING gin (to_tsvector('simple', full_name));
CREATE INDEX idx_voter_registry_name_trgm ON public.voter_registry (lower(full_name));

-- Grants: registry is a public lookup, read-only for clients; writes via service role only
GRANT SELECT ON public.voter_registry TO anon;
GRANT SELECT ON public.voter_registry TO authenticated;
GRANT ALL ON public.voter_registry TO service_role;

ALTER TABLE public.voter_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voter registry is publicly readable"
ON public.voter_registry
FOR SELECT
USING (true);

-- Public storage bucket for voter portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('voter-photos', 'voter-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Voter photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voter-photos');