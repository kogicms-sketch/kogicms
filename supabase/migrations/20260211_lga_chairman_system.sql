-- ============================================================================
-- LGA CHAIRMAN & COUNCILLOR SYSTEM
-- Complete system for managing 34 LGA Chairmen and their Councillors
-- 
-- IMPORTANT: This migration requires 20260211_add_chairman_roles.sql to run first
-- ============================================================================

-- ============================================================================
-- 1. CREATE LGA CHAIRMEN TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.lga_chairmen (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    lga text NOT NULL UNIQUE,
    chairman_name text NOT NULL,
    phone text,
    email text UNIQUE NOT NULL,
    party text DEFAULT 'APC',
    election_date date,
    sworn_in_date date,
    must_change_password boolean DEFAULT true,
    last_password_change timestamp with time zone,
    is_active boolean DEFAULT true,
    photo_url text,
    bio text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chairmen_lga ON public.lga_chairmen(lga);
CREATE INDEX IF NOT EXISTS idx_chairmen_user_id ON public.lga_chairmen(user_id);
CREATE INDEX IF NOT EXISTS idx_chairmen_active ON public.lga_chairmen(is_active);

-- Add comments
COMMENT ON TABLE public.lga_chairmen IS 'Stores profiles and credentials for all 34 LGA Chairmen';
COMMENT ON COLUMN public.lga_chairmen.must_change_password IS 'Forces password change on first login';

-- ============================================================================
-- 3. CREATE COUNCILLORS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.councillors (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    chairman_id uuid REFERENCES public.lga_chairmen(id) ON DELETE CASCADE NOT NULL,
    lga text NOT NULL,
    ward text NOT NULL,
    councillor_name text NOT NULL,
    phone text,
    email text UNIQUE NOT NULL,
    must_change_password boolean DEFAULT true,
    last_password_change timestamp with time zone,
    is_active boolean DEFAULT true,
    photo_url text,
    created_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(lga, ward)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_councillors_chairman ON public.councillors(chairman_id);
CREATE INDEX IF NOT EXISTS idx_councillors_lga_ward ON public.councillors(lga, ward);
CREATE INDEX IF NOT EXISTS idx_councillors_user_id ON public.councillors(user_id);

-- Add comments
COMMENT ON TABLE public.councillors IS 'Stores councillor profiles assigned to specific wards';

-- ============================================================================
-- 4. CREATE SUPPORT GROUP CREDENTIALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.support_group_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    support_group_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    chairman_id uuid REFERENCES public.lga_chairmen(id) ON DELETE CASCADE NOT NULL,
    username text UNIQUE NOT NULL,
    lga text NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    generated_by uuid REFERENCES auth.users(id) NOT NULL,
    is_active boolean DEFAULT true,
    last_login timestamp with time zone,
    notes text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sg_credentials_group ON public.support_group_credentials(support_group_id);
CREATE INDEX IF NOT EXISTS idx_sg_credentials_chairman ON public.support_group_credentials(chairman_id);
CREATE INDEX IF NOT EXISTS idx_sg_credentials_lga ON public.support_group_credentials(lga);

-- Add comments
COMMENT ON TABLE public.support_group_credentials IS 'Stores generated credentials for support groups created by chairmen';

-- ============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.lga_chairmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.councillors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_group_credentials ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS POLICIES FOR LGA_CHAIRMEN
-- ============================================================================

-- Super admins can see all chairmen
CREATE POLICY "Super admins can view all chairmen" ON public.lga_chairmen
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Chairmen can view their own record
CREATE POLICY "Chairmen can view own record" ON public.lga_chairmen
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Chairmen can update their own record
CREATE POLICY "Chairmen can update own record" ON public.lga_chairmen
    FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 7. RLS POLICIES FOR COUNCILLORS
-- ============================================================================

-- Super admins can see all councillors
CREATE POLICY "Super admins can view all councillors" ON public.councillors
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Chairmen can view councillors in their LGA
CREATE POLICY "Chairmen can view their councillors" ON public.councillors
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = councillors.lga
        )
    );

-- Councillors can view their own record
CREATE POLICY "Councillors can view own record" ON public.councillors
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- Chairmen can insert councillors in their LGA
CREATE POLICY "Chairmen can create councillors" ON public.councillors
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = councillors.lga
        )
    );

-- Chairmen can update councillors in their LGA
CREATE POLICY "Chairmen can update their councillors" ON public.councillors
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = councillors.lga
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = councillors.lga
        )
    );

-- ============================================================================
-- 8. RLS POLICIES FOR SUPPORT_GROUP_CREDENTIALS
-- ============================================================================

-- Super admins can see all credentials
CREATE POLICY "Super admins can view all credentials" ON public.support_group_credentials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'super_admin'
        )
    );

-- Chairmen can view credentials they created
CREATE POLICY "Chairmen can view their credentials" ON public.support_group_credentials
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND id = support_group_credentials.chairman_id
        )
    );

-- Chairmen can create credentials
CREATE POLICY "Chairmen can create credentials" ON public.support_group_credentials
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND id = support_group_credentials.chairman_id
        )
    );

-- ============================================================================
-- 9. RLS POLICIES FOR EXISTING TABLES (Data Filtering)
-- ============================================================================

-- Chairmen can only see polling units in their LGA
CREATE POLICY "Chairmen see only their LGA polling units" ON public.polling_unit_cells
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = polling_unit_cells.lga
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'org_admin')
        )
    );

-- Councillors can only see polling units in their ward
CREATE POLICY "Councillors see only their ward polling units" ON public.polling_unit_cells
    FOR SELECT 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.councillors 
            WHERE user_id = auth.uid() 
            AND lga = polling_unit_cells.lga 
            AND ward = polling_unit_cells.ward
        )
        OR
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'org_admin', 'lga_chairman')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.lga_chairmen 
            WHERE user_id = auth.uid() 
            AND lga = polling_unit_cells.lga
        )
    );

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to create LGA Chairman with credentials
CREATE OR REPLACE FUNCTION create_lga_chairman(
    p_lga text,
    p_chairman_name text,
    p_email text,
    p_password text,
    p_phone text DEFAULT NULL,
    p_party text DEFAULT 'APC',
    p_election_date date DEFAULT NULL,
    p_sworn_in_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    v_user_id uuid;
    v_chairman_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- Generate password hash
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change_token,
        phone_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        now(),
        jsonb_build_object('full_name', p_chairman_name),
        now(),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id, 
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email,
        now(),
        now(),
        now()
    );

    -- Create profile
    INSERT INTO public.profiles (id, full_name, phone_number, email)
    VALUES (v_user_id, p_chairman_name, p_phone, p_email)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, 
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        email = EXCLUDED.email;

    -- Assign role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'lga_chairman')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create chairman record
    INSERT INTO public.lga_chairmen (
        user_id,
        lga,
        chairman_name,
        phone,
        email,
        party,
        election_date,
        sworn_in_date,
        must_change_password
    ) VALUES (
        v_user_id,
        p_lga,
        p_chairman_name,
        p_phone,
        p_email,
        p_party,
        p_election_date,
        p_sworn_in_date,
        true
    ) RETURNING id INTO v_chairman_id;

    RETURN json_build_object(
        'success', true, 
        'user_id', v_user_id,
        'chairman_id', v_chairman_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to create Councillor
CREATE OR REPLACE FUNCTION create_councillor(
    p_chairman_id uuid,
    p_lga text,
    p_ward text,
    p_councillor_name text,
    p_email text,
    p_password text,
    p_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    v_user_id uuid;
    v_councillor_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- Generate password hash
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change_token,
        phone_change
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        v_encrypted_pw,
        now(),
        jsonb_build_object('full_name', p_councillor_name),
        now(),
        now(),
        '',
        '',
        '',
        '',
        '',
        '',
        ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id, 
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', p_email),
        'email',
        p_email,
        now(),
        now(),
        now()
    );

    -- Create profile
    INSERT INTO public.profiles (id, full_name, phone_number, email)
    VALUES (v_user_id, p_councillor_name, p_phone, p_email)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, 
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        email = EXCLUDED.email;

    -- Assign role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'councillor')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create councillor record
    INSERT INTO public.councillors (
        user_id,
        chairman_id,
        lga,
        ward,
        councillor_name,
        phone,
        email,
        must_change_password,
        created_by
    ) VALUES (
        v_user_id,
        p_chairman_id,
        p_lga,
        p_ward,
        p_councillor_name,
        p_phone,
        p_email,
        true,
        auth.uid()
    ) RETURNING id INTO v_councillor_id;

    RETURN json_build_object(
        'success', true, 
        'user_id', v_user_id,
        'councillor_id', v_councillor_id,
        'credentials', json_build_object('email', p_email, 'password', p_password)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to generate support group credentials
CREATE OR REPLACE FUNCTION generate_support_group_credentials(
    p_support_group_id uuid,
    p_chairman_id uuid,
    p_username text,
    p_password text,
    p_lga text
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    v_credential_id uuid;
BEGIN
    -- Insert credential record
    INSERT INTO public.support_group_credentials (
        support_group_id,
        chairman_id,
        username,
        lga,
        generated_by
    ) VALUES (
        p_support_group_id,
        p_chairman_id,
        p_username,
        p_lga,
        auth.uid()
    ) RETURNING id INTO v_credential_id;

    RETURN json_build_object(
        'success', true, 
        'credential_id', v_credential_id,
        'username', p_username
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Function to change chairman password
CREATE OR REPLACE FUNCTION change_chairman_password(
    p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_pw text;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;

    -- Generate password hash
    v_encrypted_pw := crypt(p_new_password, gen_salt('bf'));

    -- Update password
    UPDATE auth.users 
    SET encrypted_password = v_encrypted_pw,
        updated_at = now()
    WHERE id = v_user_id;

    -- Update chairman record
    UPDATE public.lga_chairmen 
    SET must_change_password = false,
        last_password_change = now(),
        updated_at = now()
    WHERE user_id = v_user_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ============================================================================
-- 11. TRIGGERS
-- ============================================================================

-- Update timestamp trigger for lga_chairmen
CREATE TRIGGER update_lga_chairmen_updated_at
    BEFORE UPDATE ON public.lga_chairmen
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for councillors
CREATE TRIGGER update_councillors_updated_at
    BEFORE UPDATE ON public.councillors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
