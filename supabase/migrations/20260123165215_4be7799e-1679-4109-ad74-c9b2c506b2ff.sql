-- Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS device_info text;

-- Note: account_status, suspension_reason, last_device_info, last_login_at already exist based on the types file
-- Just need to ensure device_info exists for the check_and_update_device function