-- Migration: Add Secure Device Check Function
-- This function handles device verification on the server side to bypass RLS issues
-- and ensure security logic is enforced reliably.

CREATE OR REPLACE FUNCTION check_and_update_device(p_device_info TEXT)
RETURNS JSONB AS $$
DECLARE
    v_last_device TEXT;
    v_status TEXT;
    v_user_id UUID := auth.uid();
BEGIN
    -- Get current info
    SELECT last_device_info, account_status INTO v_last_device, v_status
    FROM profiles WHERE id = v_user_id;

    -- If already suspended, just return that
    IF v_status <> 'active' THEN
        RETURN jsonb_build_object('status', v_status);
    END IF;

    IF v_last_device IS NULL THEN
        -- First login, save it
        UPDATE profiles SET last_device_info = p_device_info, last_login_at = NOW()
        WHERE id = v_user_id;
        RETURN jsonb_build_object('status', 'active', 'action', 'device_registered');
    
    ELSIF v_last_device <> p_device_info THEN
        -- Mismatch! Suspend!
        UPDATE profiles SET 
            account_status = 'suspended', 
            suspension_reason = 'Security Alert: Unrecognized Device Detected'
        WHERE id = v_user_id;
        
        -- Log it (Action type need not strictly match 'SECURITY_ALERT' table constraint if it is text, 
        -- assuming admin_audit_logs action_type is TEXT. If it's an ENUM, we should be careful. 
        -- Based on previous files, it's TEXT.)
        INSERT INTO admin_audit_logs (admin_id, action_type, details, performed_by, created_at)
        VALUES (
            v_user_id,
            'SECURITY_ALERT',
            jsonb_build_object(
                'event', 'DEVICE_MISMATCH',
                'old_device', v_last_device,
                'new_device', p_device_info
            ),
            v_user_id,
            NOW()
        );
        
        RETURN jsonb_build_object('status', 'suspended', 'action', 'mismatch_detected');
    ELSE
        -- Same device, update login time
        UPDATE profiles SET last_login_at = NOW()
        WHERE id = v_user_id;
        RETURN jsonb_build_object('status', 'active', 'action', 'login_updated');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access
GRANT EXECUTE ON FUNCTION check_and_update_device TO authenticated;
