-- ============================================================================
-- CREATE LGA CHAIRMAN USER ACCOUNTS
-- Creates auth.users and profiles for all 34 LGA Chairmen
-- Default password: lga@cms (should be changed on first login)
-- ============================================================================

-- Note: This migration creates users with hashed passwords
-- Default credentials for each chairman:
-- Email: {lga_name}cms@gmail.com
-- Password: {lga_name}@cms (e.g., katsinacms@gmail.com / katsina@cms)

-- Helper function to generate consistent user IDs
CREATE OR REPLACE FUNCTION generate_chairman_user(
    p_email text,
    p_password text,
    p_full_name text,
    p_lga text
) RETURNS uuid AS $$
DECLARE
    v_user_id uuid;
    v_encrypted_password text;
BEGIN
    -- Generate user ID
    v_user_id := gen_random_uuid();
    
    -- Hash password using crypt (bcrypt)
    v_encrypted_password := crypt(p_password, gen_salt('bf'));
    
    -- Insert into auth.users
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        aud,
        role,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change_token,
        phone_change
    ) VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        v_encrypted_password,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', p_full_name, 'lga', p_lga),
        now(),
        now(),
        '',
        'authenticated',
        'authenticated',
        '',
        '',
        '',
        '',
        ''
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role
    ) VALUES (
        v_user_id,
        p_email,
        p_full_name,
        'lga_chairman'::public.app_role
    );
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Create all 34 LGA Chairman accounts
DO $$
DECLARE
    chairman_data record;
    chairmen_list text[][] := ARRAY[
        ARRAY['Bakori', 'bakoricms@gmail.com', 'bakori@cms', 'Hon. Aminu Dan-Hamidu'],
        ARRAY['Batagarawa', 'batagarawacms@gmail.com', 'batagarawa@cms', 'Hon. Yahaya Lawal Kawo'],
        ARRAY['Batsari', 'batsaricms@gmail.com', 'batsari@cms', 'Hon. Mannir Muazu Rumah'],
        ARRAY['Baure', 'baurecms@gmail.com', 'baure@cms', 'Hon. Saminu Sulaiman Baure'],
        ARRAY['Bindawa', 'bindawacms@gmail.com', 'bindawa@cms', 'Hon. Badaru Musa Giremawa'],
        ARRAY['Charanchi', 'charanchicms@gmail.com', 'charanchi@cms', 'Hon. Ibrahim Sani Koda'],
        ARRAY['Dandume', 'dandumecms@gmail.com', 'dandume@cms', 'Hon. Bishir Sabu Gyazama'],
        ARRAY['Danja', 'danjacms@gmail.com', 'danja@cms', 'Hon. Rabo Tambaya'],
        ARRAY['Dan Musa', 'danmusacms@gmail.com', 'danmusa@cms', 'Hon. Ibrahim Namama'],
        ARRAY['Daura', 'dauracms@gmail.com', 'daura@cms', 'Hon. Bala Musa'],
        ARRAY['Dutsi', 'dutsicms@gmail.com', 'dutsi@cms', 'Hon. Abdulrazaq Adamu Kayawa'],
        ARRAY['Dutsin-Ma', 'dutsinmacms@gmail.com', 'dutsinma@cms', 'Hon. Kabir Abdul Salam Shema'],
        ARRAY['Faskari', 'faskaricms@gmail.com', 'faskari@cms', 'Hon. Surajo Aliyu Daudawa'],
        ARRAY['Funtua', 'funtuacms@gmail.com', 'funtua@cms', 'Hon. Abdullahi Goya'],
        ARRAY['Ingawa', 'ingawacms@gmail.com', 'ingawa@cms', 'Hon. Abdullahi Idris II'],
        ARRAY['Jibia', 'jibiacms@gmail.com', 'jibia@cms', 'Hon. Surajo Ado Jibia'],
        ARRAY['Kafur', 'kafurcms@gmail.com', 'kafur@cms', 'Hon. Surajo Bature'],
        ARRAY['Kaita', 'kaitacms@gmail.com', 'kaita@cms', 'Hon. Bello Lawal Yandaki'],
        ARRAY['Kankara', 'kankaracms@gmail.com', 'kankara@cms', 'Hon. Kasimu Dantsoho Katoge'],
        ARRAY['Kankia', 'kankiacms@gmail.com', 'kankia@cms', 'Hon. Lawal Abdul Gezi'],
        ARRAY['Katsina', 'katsinacms@gmail.com', 'katsina@cms', 'Hon. Isah Miqdad AD Saude'],
        ARRAY['Kurfi', 'kurficms@gmail.com', 'kurfi@cms', 'Hon. Babangida Abdullahi'],
        ARRAY['Kusada', 'kusadacms@gmail.com', 'kusada@cms', 'Hon. Sani Adamu Dan Gamau'],
        ARRAY['Mai''Adua', 'maiaduacms@gmail.com', 'maiadua@cms', 'Hon. Mamman Salisu Na-Allahu'],
        ARRAY['Malumfashi', 'malumfashicms@gmail.com', 'malumfashi@cms', 'Hon. Muntari Abdullahi City'],
        ARRAY['Mani', 'manicms@gmail.com', 'mani@cms', 'Hon. Dr. Yunusa Muhammad Sani'],
        ARRAY['Mashi', 'mashicms@gmail.com', 'mashi@cms', 'Hon. Salisu Kallan Dan Kada'],
        ARRAY['Matazu', 'matazucms@gmail.com', 'matazu@cms', 'Hon. Shamsuddeen Muhammad'],
        ARRAY['Musawa', 'musawacms@gmail.com', 'musawa@cms', 'Hon. Aliyu Idris Gin-Gin'],
        ARRAY['Rimi', 'rimicms@gmail.com', 'rimi@cms', 'Hon. Muhammad Ali Rimi'],
        ARRAY['Sabuwa', 'sabuwacms@gmail.com', 'sabuwa@cms', 'Hon. Usamatu Adamu Damari'],
        ARRAY['Safana', 'safanacms@gmail.com', 'safana@cms', 'Hon. Abdullahi Sani Brazil'],
        ARRAY['Sandamu', 'sandamucms@gmail.com', 'sandamu@cms', 'Hon. Usman Nalado Matawalle'],
        ARRAY['Zango', 'zangocms@gmail.com', 'zango@cms', 'Hon. Babangida Yardaje']
    ];
BEGIN
    FOR i IN 1..array_length(chairmen_list, 1) LOOP
        -- Skip if email already exists
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = chairmen_list[i][2]) THEN
            PERFORM generate_chairman_user(
                chairmen_list[i][2],  -- email
                chairmen_list[i][3],  -- password
                chairmen_list[i][4],  -- full_name
                chairmen_list[i][1]   -- lga
            );
            RAISE NOTICE 'Created chairman account: % - %', chairmen_list[i][1], chairmen_list[i][2];
        ELSE
            RAISE NOTICE 'Chairman account already exists: %', chairmen_list[i][2];
        END IF;
    END LOOP;
END $$;

-- Drop the helper function
DROP FUNCTION IF EXISTS generate_chairman_user(text, text, text, text);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all chairman accounts were created
DO $$
DECLARE
    chairman_count integer;
BEGIN
    SELECT COUNT(*) INTO chairman_count 
    FROM public.profiles 
    WHERE role = 'lga_chairman';
    
    RAISE NOTICE 'Total LGA Chairman accounts created: %', chairman_count;
    
    IF chairman_count >= 34 THEN
        RAISE NOTICE '✓ All 34 LGA Chairman accounts have been created successfully!';
    ELSE
        RAISE WARNING '⚠ Only % out of 34 chairman accounts were created', chairman_count;
    END IF;
END $$;
