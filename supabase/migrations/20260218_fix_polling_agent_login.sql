-- ============================================================================
-- FIX POLLING UNIT AGENT LOGIN
-- Purpose: Fix get_auth_role() to properly detect polling_unit_agent role
-- Issue: Polling unit agents get "Database error querying schema" on login
-- Root Cause: get_auth_role() returns NULL for polling unit agents
-- ============================================================================

-- The get_auth_role() function needs to properly return 'polling_unit_agent'
-- when the user has that role in the user_roles table.

CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Runs as Owner (bypass RLS)
SET search_path = public
AS $$
DECLARE
  _role text;
  _user_id uuid;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN 
    RETURN NULL; 
  END IF;
  
  -- Query user_roles table for the role
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
  
  -- If no role found in user_roles, return NULL
  -- This is expected for users who haven't been assigned a role yet
  RETURN _role;
END;
$$;

-- Also ensure the get_user_role RPC function works correctly
-- This is what AuthContext.tsx actually calls
-- Drop the old function first to avoid signature conflicts
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  LIMIT 1;
$$;

-- Ensure polling unit agents can read their own profile
-- This is critical for the auth flow
DROP POLICY IF EXISTS "Polling agents can view own profile" ON public.profiles;
CREATE POLICY "Polling agents can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role::text = 'polling_unit_agent'
  )
);

-- Fix NULL token fields in auth.users that cause scan errors
-- The Supabase Auth service expects these to be empty strings, not NULL
UPDATE auth.users
SET 
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, '')
WHERE 
  email_change_token_new IS NULL 
  OR email_change IS NULL 
  OR email_change_token_current IS NULL
  OR phone_change_token IS NULL
  OR phone_change IS NULL;

-- Reload schema
NOTIFY pgrst, 'reload schema';

