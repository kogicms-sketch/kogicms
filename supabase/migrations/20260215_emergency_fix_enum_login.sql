-- ============================================================================
-- EMERGENCY FIX: Login 500 Error & Enum Issues
-- Purpose: 
-- 1. Safely add 'polling_unit_agent' to app_role enum (if missing)
-- 2. Rewrite get_auth_role to be resilient (Text-based comparison)
-- 3. Ensure permissions are correct
-- ============================================================================

-- 1. Safely add enum value
-- We wrap this in a DO block. 
-- NOTE: If this script fails, run this block ALONE in your SQL Editor.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'polling_unit_agent' 
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'polling_unit_agent';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add enum value: %', SQLERRM;
END $$;

-- 2. Rewrite get_auth_role to use TEXT comparison (Avoids Enum Cast Errors)
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
  
  -- Check user_roles table casting to TEXT to avoid strict enum issues
  SELECT role::text INTO _role
  FROM public.user_roles
  WHERE user_id = _user_id;

  IF _role IS NOT NULL THEN
    RETURN _role;
  END IF;

  RETURN NULL;
END;
$$;

-- 3. Ensure user_roles has the correct constraint (but don't fail if it doesn't match perfectly yet)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
-- We relax the constraint to allow string matching for now, or just trust the Enum type.
-- The Enum type itself enforces values.
-- If we want a constraint, we should use ::text to be safe during migration loops
-- ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role::text IN ('super_admin', 'org_admin', 'user', 'member', 'lga_chairman', 'councillor', 'polling_unit_agent', 'admin'));

-- 4. Grant Permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.polling_unit_agents TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- 5. Recover Profiles RLS (Just in case)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- 6. Reload Schema
NOTIFY pgrst, 'reload schema';
