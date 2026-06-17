-- ============================================================================
-- MANUAL FIX FOR SUPER ADMIN ROLE
-- Run this script in your Supabase SQL Editor
-- ============================================================================

-- 1. Ensure the user exists (if not, you must sign up via the app first)
DO $$
DECLARE
    target_email text := 'test@gmail.com';
    target_user_id uuid;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

    IF target_user_id IS NULL THEN
        RAISE NOTICE 'User % not found. Please sign up first.', target_email;
    ELSE
        RAISE NOTICE 'Found user % with ID %', target_email, target_user_id;

        -- 2. Ensure Profile Exists
        INSERT INTO public.profiles (id, email, full_name, account_status)
        VALUES (
            target_user_id,
            target_email,
            'Super Admin User',
            'active'
        )
        ON CONFLICT (id) DO UPDATE
        SET account_status = 'active';

        -- 3. Assign Super Admin Role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'super_admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- 4. Verify the role was assigned
        IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = target_user_id AND role = 'super_admin') THEN
            RAISE NOTICE 'SUCCESS: User % is now a Super Admin.', target_email;
        ELSE
            RAISE EXCEPTION 'FAILED: Could not assign role.';
        END IF;
    END IF;
END $$;

-- 5. Fix Permissions (Just in case RLS is blocking access)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated;

-- 6. Recreate the RPC function to ensure it exists and is accessible
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role app_role;
BEGIN
  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = target_user_id;
  
  RETURN _role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- 7. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
