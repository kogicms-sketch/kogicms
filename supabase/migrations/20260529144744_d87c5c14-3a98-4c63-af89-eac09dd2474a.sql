-- Add verification metadata columns to election_results
ALTER TABLE public.election_results
  ADD COLUMN IF NOT EXISTS verified_by text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_note text;

-- Allow updates so super admins can approve / reject / correct results.
-- This app authenticates on a separate backend, so role checks are enforced
-- client-side (consistent with the existing public access model on this table).
DROP POLICY IF EXISTS "Anyone can update results" ON public.election_results;
CREATE POLICY "Anyone can update results"
ON public.election_results
FOR UPDATE
USING (true)
WITH CHECK (true);

GRANT UPDATE ON public.election_results TO anon;
GRANT UPDATE ON public.election_results TO authenticated;