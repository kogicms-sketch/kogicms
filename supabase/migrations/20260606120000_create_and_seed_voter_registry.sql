-- ============================================================================
-- CREATE AND SEED VOTER REGISTRY
-- Purpose: Creates the missing voter_registry table, indexes, policies, 
--          views, and seeds it with test voters (including the test VIN 
--          from the search form to enable auto-fill testing).
-- ============================================================================

-- 1. Create voter_registry table if not exists
CREATE TABLE IF NOT EXISTS public.voter_registry (
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

-- 2. Indexes for fast lookup by VIN and name search
CREATE INDEX IF NOT EXISTS idx_voter_registry_vin ON public.voter_registry (vin);
CREATE INDEX IF NOT EXISTS idx_voter_registry_name ON public.voter_registry USING gin (to_tsvector('simple', full_name));
CREATE INDEX IF NOT EXISTS idx_voter_registry_name_trgm ON public.voter_registry (lower(full_name));

-- 3. Enable RLS
ALTER TABLE public.voter_registry ENABLE ROW LEVEL SECURITY;

-- 4. Recreate select policy
DROP POLICY IF EXISTS "Voter registry is publicly readable" ON public.voter_registry;
CREATE POLICY "Voter registry is publicly readable"
ON public.voter_registry
FOR SELECT
USING (true);

-- 5. Grants
GRANT SELECT ON public.voter_registry TO anon;
GRANT SELECT ON public.voter_registry TO authenticated;
GRANT ALL ON public.voter_registry TO service_role;

-- 6. Public storage bucket for voter portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('voter-photos', 'voter-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Voter photos are publicly accessible" ON storage.objects;
CREATE POLICY "Voter photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'voter-photos');

-- 7. Seed test voter data
INSERT INTO public.voter_registry (vin, full_name, dob_year, gender, lga, ward, polling_unit_code, polling_unit_name, photo_url)
VALUES 
  ('90F5B13181296059968', 'BABANGIDA, AHMED', 1990, 'M', 'Katsina', 'Wakilin Kudu II', '20-17-03-010', 'S Gari K Rafa K G A Sabe', NULL),
  ('030DEFE01F296732782', 'MUSA, ABDULLAHI', 1988, 'M', 'Katsina', 'Wakilin Kudu II', '20-17-04-014', 'Barazaki K Gidan Urwatu', NULL),
  ('90F5B1D10F418684009', 'ABUBAKAR, BELLO', 1993, 'M', 'Katsina', 'Wakilin Kudu II', '20-17-04-001', 'Sabuwar Kofa S Kofa Pri School I', NULL),
  ('90F5B1D10F418353055', 'IBRAHIM, SHITU', 1991, 'M', 'Katsina', 'Wakilin Kudu II', '20-17-04-001', 'Sabuwar Kofa S Kofa Pri School I', NULL),
  ('90F5B062FC295872300', 'YUSUF, ALIYU', 1995, 'M', 'Katsina', 'Wakilin Kudu II', '20-21-03-008', 'Saulawa K G Sarkin Tasha', NULL),
  ('90F5B1FB4E535732823', 'MUSA', 1985, 'M', 'Katsina', 'Kangiwa', '20-17-03-040', 'Bakin Katsina Township Stadium', 'https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-17-03-040/90F5B1FB4E535732823.jpeg'),
  ('INC22000000015276839', 'MUSA', 1990, 'F', 'Katsina', 'Wakilin Kudu II', '20-17-04-009', 'S Kasuwa K Gidan A Nadada I', 'https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-17-04-009/INC22000000015276839.jpeg'),
  ('INC22000000019877110', 'MUSA', 1980, 'M', 'Katsina', 'Wakilin Gabas II', '20-17-02-036', 'Lambun Magaji Gari', NULL)
ON CONFLICT (vin) DO NOTHING;

-- 8. Apply official voter portraits URLs from migrations
UPDATE public.voter_registry SET photo_url='https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-17-04-014/030DEFE01F296732782.jpeg' WHERE vin='030DEFE01F296732782';
UPDATE public.voter_registry SET photo_url='https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-17-04-001/90F5B1D10F418684009.jpeg' WHERE vin='90F5B1D10F418684009';
UPDATE public.voter_registry SET photo_url='https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-17-04-001/90F5B1D10F418353055.jpeg' WHERE vin='90F5B1D10F418353055';
UPDATE public.voter_registry SET photo_url='https://ltpsylgqcwxaprsvabap.supabase.co/storage/v1/object/public/voter-photos/20-21-03-008/90F5B062FC295872300.jpeg' WHERE vin='90F5B062FC295872300';

-- 9. Recreate public.voter_pu_counts view
CREATE OR REPLACE VIEW public.voter_pu_counts AS
SELECT
  ward,
  polling_unit_code,
  max(polling_unit_name) AS polling_unit_name,
  count(*)::int AS registered_count
FROM public.voter_registry
GROUP BY ward, polling_unit_code;

-- 10. View Grants
GRANT SELECT ON public.voter_pu_counts TO anon;
GRANT SELECT ON public.voter_pu_counts TO authenticated;
GRANT SELECT ON public.voter_pu_counts TO service_role;

-- 11. Security Invoker setting
ALTER VIEW public.voter_pu_counts SET (security_invoker = true);

-- 12. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
