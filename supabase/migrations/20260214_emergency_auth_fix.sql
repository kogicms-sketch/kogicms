-- ============================================================================
-- EMERGENCY FIX: Auth 500 Error - Database error querying schema
-- This error happens during sign-in, before get_user_role is called
-- Root causes: trigger on auth.users, corrupted auth data, or schema issues
-- ============================================================================

-- ============================================================================
-- STEP 1: Check if there's a trigger on auth.users causing issues
-- ============================================================================

-- Drop problematic trigger on auth.users if it exists
-- (This trigger might be firing during sign-in and failing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- ============================================================================
-- STEP 2: Fix handle_new_user function to handle edge cases
-- Make it more resilient to prevent 500 errors
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Handle edge case: user already has a profile
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    -- Just update the email if it changed
    UPDATE public.profiles 
    SET email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- Insert new profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    account_status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth operation
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger safely (only if it doesn't cause issues)
-- Note: This trigger runs AFTER INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- STEP 3: Fix councillor user data corruption
-- The error might be due to NULL values in required auth.users columns
-- ============================================================================

-- Fix all councillor users' auth data
UPDATE auth.users
SET
  -- String columns that must have default values
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token = COALESCE(recovery_token, ''),
  confirmation_token = COALESCE(confirmation_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  
  -- Boolean/integer columns
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false),
  
  -- Ensure timestamps are valid
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  last_sign_in_at = COALESCE(last_sign_in_at, NOW()),
  
  -- Ensure required auth fields
  aud = COALESCE(aud, 'authenticated'),
  role = COALESCE(role, 'authenticated')
WHERE id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'councillor'
);

-- ============================================================================
-- STEP 4: Ensure councillor profiles exist and are complete
-- ============================================================================

-- Create missing profiles for councillors
INSERT INTO public.profiles (id, email, full_name, account_status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'active',
  NOW(),
  NOW()
FROM auth.users au
JOIN public.user_roles ur ON au.id = ur.user_id
LEFT JOIN public.profiles p ON au.id = p.id
WHERE ur.role = 'councillor'
AND p.id IS NULL;

-- Update existing councillor profiles to ensure account_status is set
UPDATE public.profiles
SET account_status = COALESCE(account_status, 'active'),
    updated_at = NOW()
WHERE id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'councillor'
);

-- ============================================================================
-- STEP 5: Ensure user_roles has proper grants and RLS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;

-- Ensure user_roles is accessible
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- ============================================================================
-- STEP 6: Fix RLS policies that might cause recursion during auth
-- ============================================================================

-- Temporarily disable RLS on profiles to test if it's causing issues
-- (Re-enable after testing)
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Or ensure the policies don't cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create simple policies that don't recurse
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- ============================================================================
-- STEP 7: Clear auth cache and reload schema
-- ============================================================================

-- Clear any cached auth data
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION: Test queries to run after applying this fix
-- ============================================================================

/*
-- Check if councillor user exists and has valid data
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  au.last_sign_in_at,
  au.created_at,
  p.id as profile_id,
  p.account_status,
  ur.role
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE au.email = 'wakilinkuduii@gmail.com';

-- Check for NULL values in required columns
SELECT 
  email,
  email_change IS NULL as email_change_null,
  confirmation_token IS NULL as confirmation_token_null,
  recovery_token IS NULL as recovery_token_null
FROM auth.users
WHERE email = 'wakilinkuduii@gmail.com';

-- Test if handle_new_user works
SELECT public.handle_new_user();
*/

-- ============================================================================
-- ROLLBACK (if needed): How to undo this fix
-- ============================================================================

/*
-- If this causes issues, run:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- Then restore original trigger if you had one
*/

-- ============================================================================
-- END OF EMERGENCY FIX
-- ============================================================================
