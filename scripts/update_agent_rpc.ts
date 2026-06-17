import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qkjscvmrqkxbzflowrox.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFranNjdm1ycWt4YnpmbG93cm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjQzNDYsImV4cCI6MjA4NjE0MDM0Nn0.gJXP249ofTNu29NsIvskRtb7b5ZaZlPI5lRb9KwQV34';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const sql = `
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
`;

async function updateRPC() {
    console.log('⚙️ Updating create_polling_unit_agent function in Supabase...');
    try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('❌ Error updating function:', error);
            
            // Try REST API fallback
            console.log('🔄 Trying REST API fallback...');
            const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ sql_query: sql })
            });

            if (!response.ok) {
                console.error('❌ REST API Error:', await response.text());
            } else {
                console.log('✅ Updated successfully via REST API!');
            }
        } else {
            console.log('✅ Updated successfully via RPC!');
        }
    } catch (err) {
        console.error('❌ Exception:', err);
    }
}

updateRPC();
