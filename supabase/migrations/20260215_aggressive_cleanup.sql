-- ============================================================================
-- AGGRESSIVE CLEANUP: DYNAMIC TRIGGER REMOVAL & PERMISSION RESET
-- Purpose: Dynamically find and drop ALL triggers on auth.users and public.profiles
--          to guarantee no interference during login (UPDATE of last_sign_in_at).
-- ============================================================================

DO $$
DECLARE
    _trig RECORD;
    _tbl text;
BEGIN
    -- 1. DROP ALL TRIGGERS ON auth.users
    FOR _trig IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'auth' 
        AND event_object_table = 'users'
    LOOP
        Raise Notice 'Dropping trigger on auth.users: %', _trig.trigger_name;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users', _trig.trigger_name);
    END LOOP;

    -- 2. DROP ALL TRIGGERS ON public.profiles
    FOR _trig IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_schema = 'public' 
        AND event_object_table = 'profiles'
    LOOP
        Raise Notice 'Dropping trigger on public.profiles: %', _trig.trigger_name;
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.profiles', _trig.trigger_name);
    END LOOP;
END
$$;

-- 3. ENSURE RLS IS DISABLED ON CRITICAL TABLES (Redundant but safe)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.polling_unit_agents DISABLE ROW LEVEL SECURITY;

-- 4. GRANT ALL PERMISSIONS again (Just to be sure)
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.polling_unit_agents TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
