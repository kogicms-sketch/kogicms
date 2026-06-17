-- Safe Migration: Fix Profiles RLS for Super Admins
-- This script ensures Super Admins can view all profiles, which is required for the Org Admins page.

-- 1. Create Policy for Super Admins to view ALL profiles
DO $$
BEGIN
    -- Check if policy already exists to avoid error
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
END $$;

-- 2. Ensure Super Admins can UPDATE profiles (for account_status changes)
DO $$
BEGIN
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
