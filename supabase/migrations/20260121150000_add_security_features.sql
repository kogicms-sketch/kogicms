-- Migration: Add Security Columns to Profiles

-- 1. Add new columns for security tracking
DO $$
BEGIN
    -- last_device_info: Stores "Browser on OS" signature
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_device_info') THEN
        ALTER TABLE profiles ADD COLUMN last_device_info TEXT;
    END IF;

    -- suspension_reason: Stores why the user was suspended
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
        ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
    END IF;

    -- last_login_at: Tracks entry time
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_login_at') THEN
        ALTER TABLE profiles ADD COLUMN last_login_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 2. Log Security Events Function
-- We'll add a helper to easily insert security alerts into admin_audit_logs
CREATE OR REPLACE FUNCTION log_security_alert(
  p_admin_id UUID, 
  p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO admin_audit_logs (admin_id, action_type, details, performed_by, created_at)
    VALUES (
        p_admin_id,
        'SECURITY_ALERT',
        p_details,
        auth.uid(), -- The user themselves triggers this (on login)
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grant Execute Permission
GRANT EXECUTE ON FUNCTION log_security_alert TO authenticated;
