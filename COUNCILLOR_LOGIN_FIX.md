# Councillor Login Fix - Implementation Summary

## Problem
The councillor login was failing with "Database error querying schema" error.

## Root Cause
1. **Parameter name mismatch**: The `get_user_role` RPC function expected `target_user_id` parameter, but the client code (AuthContext.tsx) was calling it with `_user_id`.

2. **Missing TypeScript types**: The `get_user_role` function was not defined in the Supabase types, and the `app_role` enum was missing `lga_chairman` and `councillor` values.

3. **Potential trigger conflicts**: Audit triggers on the profiles table (`on_profile_phone_change` and `on_profile_status_change`) could be causing silent failures during authentication.

## Solution Implemented

### 1. Database Migration (20260214_fix_triggers_and_rpc.sql)
Created a comprehensive migration that:
- **Drops audit triggers temporarily** on `public.profiles` to rule them out as causes
- **Fixes `get_user_role` function** with correct `_user_id` parameter name to match client code
- **Hardens `get_auth_role` function** with better NULL handling and edge case protection
- **Adds explicit grants** for authenticated role on critical tables and functions
- **Includes verification queries** (commented out) for testing

### 2. TypeScript Types Update (src/integrations/supabase/types.ts)
- Added `get_user_role` function signature to the Functions section
- Updated `app_role` enum to include `lga_chairman` and `councillor` roles

### 3. Verification Script (20260214_verification_script.sql)
Created a manual verification script to:
- Check function signatures
- Verify triggers were dropped
- Find test councillor users
- Test RPC functions
- View RLS policies

## How to Apply

### Step 1: Apply Database Migration
```bash
# Apply the migration to your Supabase project
supabase db push

# Or run manually in Supabase SQL Editor:
# Copy contents of: supabase/migrations/20260214_fix_triggers_and_rpc.sql
```

### Step 2: Verify Migration Applied Successfully
Run these queries in Supabase SQL Editor:

```sql
-- Check function signature
SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments
FROM pg_proc 
WHERE proname = 'get_user_role'
AND pronamespace = 'public'::regnamespace;

-- Expected result: get_user_role | _user_id uuid

-- Verify triggers are dropped
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND event_object_table = 'profiles'
AND trigger_name IN ('on_profile_phone_change', 'on_profile_status_change');

-- Expected result: No rows
```

### Step 3: Test Councillor Login
1. Navigate to the login page
2. Enter councillor credentials
3. Click Sign In
4. Check browser console for any errors

### Step 4: Re-add Triggers (After Successful Login)
Once login is working, uncomment and run the RE-ADD TRIGGERS section in the migration file or run:

```sql
-- Recreate audit triggers
DROP TRIGGER IF EXISTS on_profile_phone_change ON public.profiles;
CREATE TRIGGER on_profile_phone_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)
EXECUTE FUNCTION log_admin_phone_change();

DROP TRIGGER IF EXISTS on_profile_status_change ON public.profiles;
CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status)
EXECUTE FUNCTION log_admin_status_change();
```

## Testing Checklist

- [ ] Apply migration to database
- [ ] Verify function signature shows `_user_id` parameter
- [ ] Verify triggers are dropped
- [ ] Test councillor login succeeds
- [ ] Check no console errors in browser
- [ ] Verify user role is correctly fetched
- [ ] Re-add triggers after successful test

## Rollback (If Needed)

If issues arise, you can rollback by:

1. Restoring original function signature:
```sql
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
CREATE OR REPLACE FUNCTION public.get_user_role(target_user_id uuid)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _role public.app_role;
BEGIN
  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = target_user_id;
  RETURN _role;
END;
$$;
```

2. Restoring triggers:
```sql
-- Recreate audit triggers
DROP TRIGGER IF EXISTS on_profile_phone_change ON public.profiles;
CREATE TRIGGER on_profile_phone_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)
EXECUTE FUNCTION log_admin_phone_change();

DROP TRIGGER IF EXISTS on_profile_status_change ON public.profiles;
CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status)
EXECUTE FUNCTION log_admin_status_change();
```

## Files Modified

1. `supabase/migrations/20260214_fix_triggers_and_rpc.sql` - New migration file
2. `supabase/migrations/20260214_verification_script.sql` - New verification script
3. `src/integrations/supabase/types.ts` - Added function signature and enum values

## Notes

- The TypeScript errors about duplicate 'results' identifiers in types.ts are pre-existing and unrelated to this fix
- The migration includes comments with verification queries that can be uncommented and run manually
- After successful login, remember to re-add the audit triggers for proper audit logging
