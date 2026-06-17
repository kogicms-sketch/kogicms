-- ============================================================================
-- CREATE POLLING UNITS TABLE
-- Missing dependency for Phase 2 Mobilization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.polling_units (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    code text,
    description text,
    ward_id uuid, -- Optional reference if we have a wards table later
    ward_name text NOT NULL,
    lga_id uuid, -- Optional reference
    lga_name text NOT NULL,
    state_name text DEFAULT 'Katsina',
    registered_voters integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_polling_units_ward ON public.polling_units(ward_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga ON public.polling_units(lga_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_code ON public.polling_units(code);

-- Enable RLS
ALTER TABLE public.polling_units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to polling units" ON public.polling_units
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage polling units" ON public.polling_units
    FOR ALL USING (auth.role() = 'authenticated');
