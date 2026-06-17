-- COMPREHENSIVE REPAIR SCRIPT
-- Run this in the Supabase SQL Editor to fix "Unknown Profile" issues.

-- 1. RE-APPLY RLS POLICIES (Fixes "Access Denied" issues)
DO $$
BEGIN
    -- Allow Super Admins to SELECT (View) all profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Super Admins can view all profiles'
    ) THEN
        CREATE POLICY "Super Admins can view all profiles" 
        ON profiles FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'super_admin'
          )
        );
    END IF;

    -- Allow Super Admins to UPDATE (Activate/Deactivate) all profiles
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Super Admins can update all profiles'
    ) THEN
        CREATE POLICY "Super Admins can update all profiles" 
        ON profiles FOR UPDATE
        USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'super_admin'
          )
        );
    END IF;
END $$;

-- 2. REPAIR MISSING PROFILES (Fixes "Missing Data" issues)
-- If a user has a role but no profile, this pulls data from auth.users and creates the profile.
INSERT INTO public.profiles (id, full_name, phone_number, account_status)
SELECT 
    au.id, 
    -- Try to get name from metadata, fallback to email prefix, fallback to 'Admin User'
    COALESCE(
        au.raw_user_meta_data->>'full_name', 
        au.raw_user_meta_data->>'name', 
        SPLIT_PART(au.email, '@', 1),
        'Admin User'
    ),
    -- Try to get phone from metadata or auth phone
    COALESCE(
        au.raw_user_meta_data->>'phone_number',
        au.phone
    ),
    'active'
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.role = 'org_admin'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- 3. Output success message
SELECT 'Repair complete. Missing profiles created and policies applied.' as status;
