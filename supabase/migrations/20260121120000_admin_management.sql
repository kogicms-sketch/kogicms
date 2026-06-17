-- Add account_status to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated'));

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES auth.users(id), -- Null if system or self
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for admin_audit_logs
-- Super Admins can view all logs
CREATE POLICY "Super Admins can view all admin logs" 
ON admin_audit_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'super_admin'
  )
);

-- Trigger function to log phone changes
CREATE OR REPLACE FUNCTION log_admin_phone_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.phone_number IS DISTINCT FROM NEW.phone_number THEN
        INSERT INTO admin_audit_logs (admin_id, action_type, details, performed_by, created_at)
        VALUES (
            NEW.id,
            'PHONE_CHANGE',
            jsonb_build_object(
                'old_phone', OLD.phone_number,
                'new_phone', NEW.phone_number
            ),
            auth.uid(), -- The user performing the update
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for phone changes on profiles
DROP TRIGGER IF EXISTS on_profile_phone_change ON profiles;
CREATE TRIGGER on_profile_phone_change
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)
EXECUTE FUNCTION log_admin_phone_change();

-- Function to log account status changes
CREATE OR REPLACE FUNCTION log_admin_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.account_status IS DISTINCT FROM NEW.account_status THEN
        INSERT INTO admin_audit_logs (admin_id, action_type, details, performed_by, created_at)
        VALUES (
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object(
                'old_status', OLD.account_status,
                'new_status', NEW.account_status
            ),
            auth.uid(),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for status changes on profiles
DROP TRIGGER IF EXISTS on_profile_status_change ON profiles;
CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status)
EXECUTE FUNCTION log_admin_status_change();
