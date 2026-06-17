-- ============================================================================
-- DIAGNOSTIC QUERY - Run this to check why councillor login is failing
-- Copy this entire block and run it in Supabase SQL Editor
-- ============================================================================

-- Check 1: Does the councillor user exist in auth.users?
SELECT 'Check 1: Councillor user in auth.users' as check_name;
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.last_sign_in_at,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.email = 'wakilinkuduii@gmail.com';

-- Check 2: Does the councillor have a profile?
SELECT 'Check 2: Councillor profile in public.profiles' as check_name;
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.account_status,
  p.phone_number
FROM public.profiles p
WHERE p.email = 'wakilinkuduii@gmail.com';

-- Check 3: Does the councillor have a role?
SELECT 'Check 3: Councillor role in public.user_roles' as check_name;
SELECT 
  ur.user_id,
  ur.role,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.email = 'wakilinkuduii@gmail.com';

-- Check 4: Check for NULL values in auth.users that might cause 500 error
SELECT 'Check 4: NULL values in auth.users (can cause 500 errors)' as check_name;
SELECT 
  au.email,
  CASE WHEN au.email_change IS NULL THEN 'NULL!' ELSE 'OK' END as email_change,
  CASE WHEN au.confirmation_token IS NULL THEN 'NULL!' ELSE 'OK' END as confirmation_token,
  CASE WHEN au.recovery_token IS NULL THEN 'NULL!' ELSE 'OK' END as recovery_token,
  CASE WHEN au.email_change_token_new IS NULL THEN 'NULL!' ELSE 'OK' END as email_change_token_new,
  CASE WHEN au.email_change_token_current IS NULL THEN 'NULL!' ELSE 'OK' END as email_change_token_current,
  CASE WHEN au.phone_change IS NULL THEN 'NULL!' ELSE 'OK' END as phone_change,
  CASE WHEN au.phone_change_token IS NULL THEN 'NULL!' ELSE 'OK' END as phone_change_token,
  CASE WHEN au.reauthentication_token IS NULL THEN 'NULL!' ELSE 'OK' END as reauthentication_token,
  CASE WHEN au.is_sso_user IS NULL THEN 'NULL!' ELSE 'OK' END as is_sso_user,
  CASE WHEN au.is_anonymous IS NULL THEN 'NULL!' ELSE 'OK' END as is_anonymous
FROM auth.users au
WHERE au.email = 'wakilinkuduii@gmail.com';

-- Check 5: Are there any triggers on auth.users?
SELECT 'Check 5: Triggers on auth.users' as check_name;
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';

-- Check 6: Test if the user can be retrieved via a simple query
SELECT 'Check 6: Direct user lookup test' as check_name;
SELECT 
  au.id,
  au.email,
  'User found' as status
FROM auth.users au
WHERE au.email = 'wakilinkuduii@gmail.com';

-- ============================================================================
-- IMMEDIATE FIX - Run this section if Check 4 shows any NULL values
-- ============================================================================

-- Fix NULL values that cause 500 errors
UPDATE auth.users
SET
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  recovery_token = COALESCE(recovery_token, ''),
  confirmation_token = COALESCE(confirmation_token, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
  is_sso_user = COALESCE(is_sso_user, false),
  is_anonymous = COALESCE(is_anonymous, false)
WHERE email = 'wakilinkuduii@gmail.com';

-- Fix missing profile
INSERT INTO public.profiles (id, email, full_name, account_status, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  'active',
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.email = 'wakilinkuduii@gmail.com'
AND p.id IS NULL;

-- Ensure councillor role exists
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, 'councillor'
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id AND ur.role = 'councillor'
WHERE au.email = 'wakilinkuduii@gmail.com'
AND ur.user_id IS NULL;

SELECT 'Fix applied - try logging in again' as result;
