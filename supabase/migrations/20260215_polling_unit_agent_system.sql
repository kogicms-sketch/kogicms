-- ============================================================================
-- POLLING UNIT AGENT SYSTEM (FIXED)
-- Allows Councillors to assign agents to specific Polling Units
-- Agents can only manage members within their assigned Polling Unit
-- ============================================================================

-- 1. Add polling_unit_agent to app_role enum
-- We do this in a separate transaction block typically, but for this script we assume it can run.
-- Postgres 12+ supports adding enum values in a transaction.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'polling_unit_agent' 
        AND enumtypid = 'public.app_role'::regtype
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'polling_unit_agent';
    END IF;
END $$;

-- 2. Update user_roles check constraint
-- Since the column is an ENUM, we don't strictly need a text CHECK constraint if it's type-checked.
-- However, if there IS a constraint, we must make sure it matches the enum values.
-- The previous error was invalid input value for enum app_role: "user". 
-- This implies "user" is not in the enum. The enum has "member".
-- We will DROP the old constraint to be safe and let the Enum type enforce validity.
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- 3. Create polling_unit_agents table
CREATE TABLE IF NOT EXISTS public.polling_unit_agents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    councillor_id uuid REFERENCES public.councillors(id) ON DELETE CASCADE NOT NULL,
    polling_unit_id uuid REFERENCES public.polling_units(id) ON DELETE SET NULL,
    polling_unit_name text NOT NULL,
    ward text NOT NULL,
    lga text NOT NULL,
    agent_name text NOT NULL,
    phone text,
    email text UNIQUE NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_pu_agents_jurisdiction ON public.polling_unit_agents(lga, ward, polling_unit_name);
CREATE INDEX IF NOT EXISTS idx_pu_agents_user ON public.polling_unit_agents(user_id);

-- 4. Enable RLS
ALTER TABLE public.polling_unit_agents ENABLE ROW LEVEL SECURITY;

-- 5. Jurisdictional function update (Include PU Agent check)
CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL, _polling_unit text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'::app_role
  ) OR EXISTS (
    SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = _lga AND (ward = _ward OR _ward IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = _lga
  ) OR EXISTS (
    SELECT 1 FROM public.polling_unit_agents 
    WHERE user_id = auth.uid() 
    AND lga = _lga 
    AND ward = _ward 
    AND (polling_unit_name = _polling_unit OR _polling_unit IS NULL)
  );
$$;

-- 6. Update members table policies to include polling unit granularity
DROP POLICY IF EXISTS "Jurisdictional filtered access" ON public.members;
CREATE POLICY "Jurisdictional filtered access" ON public.members FOR ALL TO authenticated
USING (public.check_auth_jurisdiction(lga, ward, polling_unit))
WITH CHECK (public.check_auth_jurisdiction(lga, ward, polling_unit));

-- 7. RLS for polling_unit_agents
DROP POLICY IF EXISTS "Super admins full access agents" ON public.polling_unit_agents;
CREATE POLICY "Super admins full access agents" ON public.polling_unit_agents FOR ALL TO authenticated 
USING (public.auth_is_super_admin());

DROP POLICY IF EXISTS "Councillors manage their agents" ON public.polling_unit_agents;
CREATE POLICY "Councillors manage their agents" ON public.polling_unit_agents FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = polling_unit_agents.lga AND ward = polling_unit_agents.ward));

DROP POLICY IF EXISTS "Agents view own record" ON public.polling_unit_agents;
CREATE POLICY "Agents view own record" ON public.polling_unit_agents FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- 8. RPC Function to create PU Agent (Security Definer)
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
    -- CAST to app_role to avoid type issues
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
