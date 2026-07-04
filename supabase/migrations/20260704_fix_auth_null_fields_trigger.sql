-- Fix NULL auth fields trigger
-- Set GoTrue token fields to empty strings ('') instead of NULL during user creation/update.
-- This avoids internal Supabase scan errors ("Database error querying schema" or 500 error) during sign-in.

CREATE OR REPLACE FUNCTION public.clean_auth_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email_change_token_new := COALESCE(NEW.email_change_token_new, '');
  NEW.email_change := COALESCE(NEW.email_change, '');
  NEW.email_change_token_current := COALESCE(NEW.email_change_token_current, '');
  NEW.phone_change_token := COALESCE(NEW.phone_change_token, '');
  NEW.phone_change := COALESCE(NEW.phone_change, '');
  NEW.confirmation_token := COALESCE(NEW.confirmation_token, '');
  NEW.recovery_token := COALESCE(NEW.recovery_token, '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS ensure_no_null_auth_fields_trigger ON auth.users;

-- Create trigger
CREATE TRIGGER ensure_no_null_auth_fields_trigger
BEFORE INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.clean_auth_user_fields();
