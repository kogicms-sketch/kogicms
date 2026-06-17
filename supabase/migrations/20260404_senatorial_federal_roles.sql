-- ============================================================================
-- SENATORIAL ZONE & FEDERAL CONSTITUENCY ROLES
-- Migration: 20260404_senatorial_federal_roles.sql
-- Applied: 2026-04-04
-- ============================================================================

-- 1. Extend app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'senatorial_leader';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'federal_rep';

-- 2. Add geographic classification columns to polling_units
ALTER TABLE public.polling_units
  ADD COLUMN IF NOT EXISTS senatorial_zone TEXT,
  ADD COLUMN IF NOT EXISTS federal_constituency TEXT;

CREATE INDEX IF NOT EXISTS idx_polling_units_senatorial_zone ON public.polling_units(senatorial_zone);
CREATE INDEX IF NOT EXISTS idx_polling_units_federal_constituency ON public.polling_units(federal_constituency);

-- 3. Create senatorial_leaders table
CREATE TABLE IF NOT EXISTS public.senatorial_leaders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    zone_name TEXT NOT NULL,
    zone_code TEXT NOT NULL,
    lga_list TEXT[] NOT NULL DEFAULT '{}',
    leader_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT true,
    last_password_change TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_senatorial_leaders_user_id ON public.senatorial_leaders(user_id);
CREATE INDEX IF NOT EXISTS idx_senatorial_leaders_zone ON public.senatorial_leaders(zone_code);

-- 4. Create federal_reps table
CREATE TABLE IF NOT EXISTS public.federal_reps (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    constituency_name TEXT NOT NULL,
    constituency_code TEXT NOT NULL,
    lga_list TEXT[] NOT NULL DEFAULT '{}',
    rep_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    must_change_password BOOLEAN DEFAULT true,
    last_password_change TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_federal_reps_user_id ON public.federal_reps(user_id);
CREATE INDEX IF NOT EXISTS idx_federal_reps_constituency ON public.federal_reps(constituency_code);

-- 5. Enable RLS
ALTER TABLE public.senatorial_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federal_reps ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- senatorial_leaders
CREATE POLICY "Super admins view all senatorial leaders" ON public.senatorial_leaders
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Senatorial leaders view own record" ON public.senatorial_leaders
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Senatorial leaders update own record" ON public.senatorial_leaders
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- federal_reps
CREATE POLICY "Super admins view all federal reps" ON public.federal_reps
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin'));
CREATE POLICY "Federal reps view own record" ON public.federal_reps
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Federal reps update own record" ON public.federal_reps
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- polling_units
CREATE POLICY "Senatorial leaders see zone polling units" ON public.polling_units
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.senatorial_leaders sl
        WHERE sl.user_id = auth.uid() AND public.polling_units.lga_name = ANY(sl.lga_list)
    ));
CREATE POLICY "Federal reps see constituency polling units" ON public.polling_units
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.federal_reps fr
        WHERE fr.user_id = auth.uid() AND public.polling_units.lga_name = ANY(fr.lga_list)
    ));

-- polling_unit_cells
CREATE POLICY "Senatorial leaders see zone cells" ON public.polling_unit_cells
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.senatorial_leaders sl
        WHERE sl.user_id = auth.uid() AND public.polling_unit_cells.lga = ANY(sl.lga_list)
    ));
CREATE POLICY "Federal reps see constituency cells" ON public.polling_unit_cells
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.federal_reps fr
        WHERE fr.user_id = auth.uid() AND public.polling_unit_cells.lga = ANY(fr.lga_list)
    ));

-- 7. Triggers
CREATE TRIGGER update_senatorial_leaders_updated_at
    BEFORE UPDATE ON public.senatorial_leaders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_federal_reps_updated_at
    BEFORE UPDATE ON public.federal_reps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATA POPULATION: Senatorial Zones
-- ============================================================================
UPDATE public.polling_units SET senatorial_zone = 'Katsina Central'
WHERE lga_name IN ('Katsina','Rimi','Batagarawa','Batsari','Safana','Ingawa','Kaita','Kurfi','Charanchi','Kusada','Kankia','Bindawa');
UPDATE public.polling_units SET senatorial_zone = 'Katsina North'
WHERE lga_name IN ('Daura','Mai''Adua','Sandamu','Mashi','Baure','Zango','Mani','Jibia','Dan Musa','Dutsi','Kankara');
UPDATE public.polling_units SET senatorial_zone = 'Katsina South'
WHERE lga_name IN ('Funtua','Dandume','Malumfashi','Kafur','Musawa','Matazu','Dutsin-Ma','Faskari','Sabuwa','Bakori','Danja');

-- ============================================================================
-- DATA POPULATION: Federal Constituencies
-- ============================================================================
UPDATE public.polling_units SET federal_constituency = 'Katsina/Rimi' WHERE lga_name IN ('Katsina','Rimi');
UPDATE public.polling_units SET federal_constituency = 'Batagarawa/Batsari/Safana' WHERE lga_name IN ('Batagarawa','Batsari','Safana');
UPDATE public.polling_units SET federal_constituency = 'Daura/Mai''Adua/Sandamu' WHERE lga_name IN ('Daura','Mai''Adua','Sandamu');
UPDATE public.polling_units SET federal_constituency = 'Ingawa/Kaita' WHERE lga_name IN ('Ingawa','Kaita');
UPDATE public.polling_units SET federal_constituency = 'Kankia/Bindawa/Kusada' WHERE lga_name IN ('Kankia','Bindawa','Kusada');
UPDATE public.polling_units SET federal_constituency = 'Kurfi/Charanchi' WHERE lga_name IN ('Kurfi','Charanchi');
UPDATE public.polling_units SET federal_constituency = 'Malumfashi/Kafur' WHERE lga_name IN ('Malumfashi','Kafur');
UPDATE public.polling_units SET federal_constituency = 'Musawa/Matazu' WHERE lga_name IN ('Musawa','Matazu');
UPDATE public.polling_units SET federal_constituency = 'Dutsin-Ma/Faskari/Sabuwa' WHERE lga_name IN ('Dutsin-Ma','Faskari','Sabuwa');
UPDATE public.polling_units SET federal_constituency = 'Funtua/Dandume' WHERE lga_name IN ('Funtua','Dandume');
UPDATE public.polling_units SET federal_constituency = 'Bakori/Danja' WHERE lga_name IN ('Bakori','Danja');
UPDATE public.polling_units SET federal_constituency = 'Mashi/Baure' WHERE lga_name IN ('Mashi','Baure');
UPDATE public.polling_units SET federal_constituency = 'Zango/Mani' WHERE lga_name IN ('Zango','Mani');
UPDATE public.polling_units SET federal_constituency = 'Dan Musa/Dutsi/Kankara' WHERE lga_name IN ('Dan Musa','Dutsi','Kankara');
UPDATE public.polling_units SET federal_constituency = 'Jibia' WHERE lga_name IN ('Jibia');
