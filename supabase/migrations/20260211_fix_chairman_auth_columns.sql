-- ============================================================================
-- FIX CHAIRMAN AUTHENTICATION - SET PROPER DEFAULT VALUES
-- Updates auth.users columns to fix "Database error querying schema" issue
-- ============================================================================

-- Update all chairman user records to set proper default values
-- This fixes the SQL scan error on email_change and other columns
UPDATE auth.users
SET
    -- String columns that must be '' not NULL
    email_change = COALESCE(email_change, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    recovery_token = COALESCE(recovery_token, ''),
    confirmation_token = COALESCE(confirmation_token, ''),
    phone_change = COALESCE(phone_change, ''),
    phone_change_token = COALESCE(phone_change_token, ''),
    reauthentication_token = COALESCE(reauthentication_token, ''),
    
    -- Numeric/boolean columns
    email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
    is_sso_user = COALESCE(is_sso_user, false),
    is_anonymous = COALESCE(is_anonymous, false)
WHERE id IN (
    SELECT id FROM public.profiles WHERE role = 'lga_chairman'
);

-- Verify the update
DO $$
DECLARE
    updated_count integer;
BEGIN
    SELECT COUNT(*) INTO updated_count
    FROM auth.users
    WHERE id IN (SELECT id FROM public.profiles WHERE role = 'lga_chairman')
    AND email_change = ''
    AND phone_change = ''
    AND is_sso_user = false
    AND is_anonymous = false;
    
    RAISE NOTICE 'Updated % chairman user records with proper default values', updated_count;
    
    IF updated_count >= 34 THEN
        RAISE NOTICE '✓ All 34 chairman accounts have been fixed!';
    ELSE
        RAISE WARNING '⚠ Only % out of 34 chairman accounts were fixed', updated_count;
    END IF;
END $$;
