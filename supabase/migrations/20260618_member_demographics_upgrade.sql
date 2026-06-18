-- Add demographic and voter lifecycle fields to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS marital_status text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS school_name text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS school_level text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_deceased boolean DEFAULT false;

-- Create indexes to optimize analytics queries
CREATE INDEX IF NOT EXISTS idx_members_gender ON public.members(gender);
CREATE INDEX IF NOT EXISTS idx_members_date_of_birth ON public.members(date_of_birth);
CREATE INDEX IF NOT EXISTS idx_members_is_deceased ON public.members(is_deceased);
CREATE INDEX IF NOT EXISTS idx_members_is_verified ON public.members(is_verified);
CREATE INDEX IF NOT EXISTS idx_members_lga_deceased ON public.members(lga) WHERE is_deceased = true;
CREATE INDEX IF NOT EXISTS idx_members_ward_deceased ON public.members(ward) WHERE is_deceased = true;
