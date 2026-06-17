-- Add status column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN status text NOT NULL DEFAULT 'active';

-- Add a check constraint to ensure valid status values
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_status_check 
CHECK (status IN ('active', 'inactive'));