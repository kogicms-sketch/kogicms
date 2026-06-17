-- ============================================================================
-- LGA CHAIRMAN & COUNCILLOR ROLES - ENUM EXTENSION
-- This must run BEFORE 20260211_lga_chairman_system.sql
-- ============================================================================

-- Create the enum type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'org_admin', 'user');
    END IF;
END $$;

-- Add lga_chairman role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'lga_chairman' 
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'lga_chairman';
    END IF;
END $$;

-- Add councillor role if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'councillor' 
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'councillor';
    END IF;
END $$;

-- ============================================================================
-- ENUM EXTENSION COMPLETE
-- Now the new enum values can be used in subsequent migrations
-- ============================================================================
