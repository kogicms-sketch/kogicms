-- ============================================================================
-- CREATE LOCATIONS (LGAs and Wards)
-- Prerequisite for Polling Unit Maps
-- ============================================================================

-- Create LGAs table
CREATE TABLE IF NOT EXISTS public.lgas (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL UNIQUE,
    state text DEFAULT 'Katsina' NOT NULL,
    code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create Wards table
CREATE TABLE IF NOT EXISTS public.wards (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    lga_id uuid REFERENCES public.lgas(id) ON DELETE CASCADE,
    code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    UNIQUE(name, lga_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wards_lga_id ON public.wards(lga_id);
CREATE INDEX IF NOT EXISTS idx_lgas_name ON public.lgas(name);

-- Enable RLS
ALTER TABLE public.lgas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

-- Policies for LGAs
-- Drop existing policies to ensure idempotency
DROP POLICY IF EXISTS "Allow public read access to lgas" ON public.lgas;

CREATE POLICY "Allow public read access to lgas" ON public.lgas
    FOR SELECT USING (true);

-- Policies for Wards
DROP POLICY IF EXISTS "Allow public read access to wards" ON public.wards;

CREATE POLICY "Allow public read access to wards" ON public.wards
    FOR SELECT USING (true);


-- ============================================================================
-- SEED DATA (Katsina State LGAs)
-- ============================================================================

INSERT INTO public.lgas (name) VALUES 
('Bakori'), ('Batagarawa'), ('Batsari'), ('Baure'), ('Bindawa'), 
('Charanchi'), ('Dandume'), ('Danja'), ('Dan Musa'), ('Daura'), 
('Dutsi'), ('Dutsin-Ma'), ('Faskari'), ('Funtua'), ('Ingawa'), 
('Jibia'), ('Kafur'), ('Kaita'), ('Kankara'), ('Kankia'), 
('Katsina'), ('Kurfi'), ('Kusada'), ('Mai''Adua'), ('Malumfashi'), 
('Mani'), ('Mashi'), ('Matazu'), ('Musawa'), ('Rimi'), 
('Sabuwa'), ('Safana'), ('Sandamu'), ('Zango')
ON CONFLICT (name) DO NOTHING;

-- Seed some sample Wards (since full list is extensive, we'll add a few per LGA for now)
-- In a real scenario, this should be a full CSV import
DO $$
DECLARE
    lga_rec RECORD;
BEGIN
    FOR lga_rec IN SELECT id, name FROM public.lgas LOOP
        INSERT INTO public.wards (name, lga_id) VALUES 
        (lga_rec.name || ' Ward A', lga_rec.id),
        (lga_rec.name || ' Ward B', lga_rec.id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
