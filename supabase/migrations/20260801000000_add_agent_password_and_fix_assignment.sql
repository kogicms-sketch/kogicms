-- 1. Add password column to polling_unit_agents table
ALTER TABLE public.polling_unit_agents ADD COLUMN IF NOT EXISTS password text;

-- 2. Update create_polling_unit_agent RPC function to support reassignment, password storage, and upserts
CREATE OR REPLACE FUNCTION create_polling_unit_agent(
    p_councillor_id uuid,
    p_polling_unit_id uuid,
    p_polling_unit_name text,
    p_ward text,
    p_lga text,
    p_agent_name text,
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
    v_agent_id uuid;
    v_encrypted_pw text;
BEGIN
    -- Unassign/deactivate any existing agent currently assigned to this polling unit
    IF p_polling_unit_id IS NOT NULL THEN
        UPDATE public.polling_unit_agents
        SET polling_unit_id = NULL,
            is_active = false
        WHERE polling_unit_id = p_polling_unit_id;
    END IF;

    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        -- Update password in auth.users
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));
        UPDATE auth.users 
        SET encrypted_password = v_encrypted_pw,
            updated_at = now()
        WHERE id = v_user_id;

        -- Update profiles
        INSERT INTO public.profiles (id, full_name, phone_number, email)
        VALUES (v_user_id, p_agent_name, p_phone, p_email)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name, 
            phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
            email = EXCLUDED.email;

        -- Assign role in user_roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (v_user_id, 'polling_unit_agent'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;

        -- Update or Insert agent record
        INSERT INTO public.polling_unit_agents (
            user_id,
            councillor_id,
            polling_unit_id,
            polling_unit_name,
            ward,
            lga,
            agent_name,
            phone,
            email,
            password,
            is_active
        ) VALUES (
            v_user_id,
            p_councillor_id,
            p_polling_unit_id,
            p_polling_unit_name,
            p_ward,
            p_lga,
            p_agent_name,
            p_phone,
            p_email,
            p_password,
            true
        )
        ON CONFLICT (user_id) DO UPDATE
        SET councillor_id = EXCLUDED.councillor_id,
            polling_unit_id = EXCLUDED.polling_unit_id,
            polling_unit_name = EXCLUDED.polling_unit_name,
            ward = EXCLUDED.ward,
            lga = EXCLUDED.lga,
            agent_name = EXCLUDED.agent_name,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            is_active = true,
            updated_at = now()
        RETURNING id INTO v_agent_id;

        RETURN json_build_object(
            'success', true, 
            'user_id', v_user_id,
            'agent_id', v_agent_id,
            'credentials', json_build_object('email', p_email, 'password', p_password)
        );
    END IF;

    -- Generate password hash for new user
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
        jsonb_build_object('full_name', p_agent_name),
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
    VALUES (v_user_id, p_agent_name, p_phone, p_email)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name, 
        phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number),
        email = EXCLUDED.email;

    -- Assign role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'polling_unit_agent'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create agent record
    INSERT INTO public.polling_unit_agents (
        user_id,
        councillor_id,
        polling_unit_id,
        polling_unit_name,
        ward,
        lga,
        agent_name,
        phone,
        email,
        password
    ) VALUES (
        v_user_id,
        p_councillor_id,
        p_polling_unit_id,
        p_polling_unit_name,
        p_ward,
        p_lga,
        p_agent_name,
        p_phone,
        p_email,
        p_password
    ) RETURNING id INTO v_agent_id;

    RETURN json_build_object(
        'success', true, 
        'user_id', v_user_id,
        'agent_id', v_agent_id,
        'credentials', json_build_object('email', p_email, 'password', p_password)
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Reload schema
NOTIFY pgrst, 'reload schema';
