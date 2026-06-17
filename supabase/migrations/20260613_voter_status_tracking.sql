-- Add voter_status column to voter_registry
ALTER TABLE public.voter_registry 
ADD COLUMN IF NOT EXISTS voter_status text DEFAULT 'alive' 
CHECK (voter_status IN ('alive', 'deceased', 'leftover'));

-- Index for querying by voter_status
CREATE INDEX IF NOT EXISTS idx_voter_registry_status ON public.voter_registry(voter_status);

-- Create policy to allow authenticated users to update voter registry status
DROP POLICY IF EXISTS "Allow authenticated users to update voter registry" ON public.voter_registry;
CREATE POLICY "Allow authenticated users to update voter registry"
ON public.voter_registry
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
