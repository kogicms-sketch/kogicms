-- Safe Migration: Admin Management & Audit Logs
-- This script is idempotent (safe to run multiple times).

-- 1. Add account_status to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
        ALTER TABLE profiles 
        ADD COLUMN account_status text DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deactivated'));
    END IF;
END $$;

-- 2. Create admin_audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id),
    action_type TEXT NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Policy SAFELY (Drop if exists then create, or use DO block)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'admin_audit_logs' 
        AND policyname = 'Super Admins can view all admin logs'
    ) THEN
        CREATE POLICY "Super Admins can view all admin logs" 
        ON admin_audit_logs FOR SELECT 
        USING (
          EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'super_admin'
          )
        );
    END IF;
END $$;

-- 5. Create Functions (OR REPLACE handles updates/existence)
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
            auth.uid(), 
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- 6. Create Triggers (Drop first to be safe)
DROP TRIGGER IF EXISTS on_profile_phone_change ON profiles;
CREATE TRIGGER on_profile_phone_change
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.phone_number IS DISTINCT FROM NEW.phone_number)
EXECUTE FUNCTION log_admin_phone_change();

DROP TRIGGER IF EXISTS on_profile_status_change ON profiles;
CREATE TRIGGER on_profile_status_change
AFTER UPDATE ON profiles
FOR EACH ROW
WHEN (OLD.account_status IS DISTINCT FROM NEW.account_status)
EXECUTE FUNCTION log_admin_status_change();
