-- ============================================================================
-- FIX AUTH TOKEN FIELDS FOR DYNAMIC USER CREATION
-- Purpose: Set GoTrue token fields to empty strings ('') instead of NULL during 
--          user creation inside SQL functions. This avoids internal Supabase scan
--          errors ("Database error querying schema" or 500 error) during sign-in.
-- ============================================================================

-- 1. Fix existing users with NULL token fields
UPDATE auth.users
SET 
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, '')
WHERE 
  email_change_token_new IS NULL 
  OR email_change IS NULL 
  OR email_change_token_current IS NULL
  OR phone_change_token IS NULL
  OR phone_change IS NULL;

-- 2. Redefine create_polling_unit_agent with token field fixes
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
    -- Check if user exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'User with this email already exists');
    END IF;

    -- Generate password hash
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));
    v_user_id := gen_random_uuid();

    -- Insert into auth.users (explicitly setting empty string token fields to prevent GoTrue scan errors)
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
        email
    ) VALUES (
        v_user_id,
        p_councillor_id,
        p_polling_unit_id,
        p_polling_unit_name,
        p_ward,
        p_lga,
        p_agent_name,
        p_phone,
        p_email
    ) RETURNING id INTO v_agent_id;

    -- Also check and insert/update polling_unit_cells
    IF p_polling_unit_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.polling_unit_cells 
            WHERE polling_unit_id = p_polling_unit_id
        ) THEN
            INSERT INTO public.polling_unit_cells (
                polling_unit_id,
                polling_unit_name,
                ward,
                lga,
                canvasser_name,
                canvasser_phone,
                status
            ) VALUES (
                p_polling_unit_id,
                p_polling_unit_name,
                p_ward,
                p_lga,
                p_agent_name,
                p_phone,
                'active'
            );
        ELSE
            -- Update canvasser details in existing cell
            UPDATE public.polling_unit_cells
            SET canvasser_name = COALESCE(canvasser_name, p_agent_name),
                canvasser_phone = COALESCE(canvasser_phone, p_phone)
            WHERE polling_unit_id = p_polling_unit_id;
        END IF;
    END IF;

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

-- 3. Redefine create_councillor with token field fixes
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

    -- Insert into auth.users (explicitly setting empty string token fields to prevent GoTrue scan errors)
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

-- 4. Redefine create_lga_chairman with token field fixes
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

    -- Insert into auth.users (explicitly setting empty string token fields to prevent GoTrue scan errors)
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
        phone_number = COALESCE(phone_number, public.profiles.phone_number),
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

-- 5. Redefine create_support_group_admin with token field fixes
CREATE OR REPLACE FUNCTION create_support_group_admin(
  org_id uuid,
  admin_email text,
  admin_password text,
  admin_name text,
  admin_phone text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  new_user_id uuid;
  encrypted_pw text;
BEGIN
  -- Check if user exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = admin_email;
  
  IF new_user_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'User with this email already exists');
  END IF;

  -- Generate Hash and ID
  encrypted_pw := crypt(admin_password, gen_salt('bf'));
  new_user_id := gen_random_uuid();

  -- Insert into auth.users (explicitly setting empty string token fields to prevent GoTrue scan errors)
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
    new_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_pw,
    now(),
    jsonb_build_object('full_name', admin_name),
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
    new_user_id, 
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', admin_email),
    'email',
    admin_email,
    now(),
    now(),
    now()
  );

  -- Ensure profile exists (handle_new_user trigger might have run, but we want to ensure phone/name is correct)
  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (new_user_id, admin_name, admin_phone)
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name, 
      phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);

  -- Assign Role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'org_admin')
  ON CONFLICT (user_id, role) DO nothing;

  -- Link to Organization
  INSERT INTO public.organization_admins (organization_id, user_id)
  VALUES (org_id, new_user_id)
  ON CONFLICT (organization_id, user_id) DO nothing;

  RETURN json_build_object('success', true, 'user_id', new_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
