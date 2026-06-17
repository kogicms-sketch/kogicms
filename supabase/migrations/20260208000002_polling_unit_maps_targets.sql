-- ============================================================================
-- POLLING UNIT MAP & TARGETS MIGRATION
-- Adding geospatial data and target tracking
-- ============================================================================

-- Add geospatial columns to polling_units table
ALTER TABLE public.polling_units 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric,
ADD COLUMN IF NOT EXISTS target_voters integer DEFAULT 500,
ADD COLUMN IF NOT EXISTS registered_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_members integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.members(id),
ADD COLUMN IF NOT EXISTS ward_name text,
ADD COLUMN IF NOT EXISTS lga_name text;

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_polling_units_location ON public.polling_units(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_polling_units_ward ON public.polling_units(ward_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga ON public.polling_units(lga_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_agent ON public.polling_units(agent_id);

-- Add sample coordinates for Katsina State (approximate center points)
-- Note: These are placeholder coordinates. Real data should be imported from INEC
UPDATE public.polling_units 
SET 
    latitude = 12.9908,
    longitude = 7.5965,
    target_voters = 500
WHERE latitude IS NULL;

-- Create view for polling unit analytics
CREATE OR REPLACE VIEW polling_unit_analytics AS
SELECT 
    pu.id,
    pu.name as polling_unit_name,
    pu.code,
    pu.latitude,
    pu.longitude,
    pu.target_voters,
    pu.registered_members,
    pu.verified_members,
    pu.ward_name,
    pu.lga_name,
    w.name as ward_name_from_join,
    l.name as lga_name_from_join,
    CASE 
        WHEN pu.target_voters > 0 THEN 
            ROUND((pu.registered_members::numeric / pu.target_voters) * 100, 2)
        ELSE 0 
    END as coverage_percentage,
    CASE 
        WHEN pu.registered_members >= pu.target_voters THEN 'green'
        WHEN pu.registered_members >= (pu.target_voters * 0.7) THEN 'yellow'
        ELSE 'red'
    END as status_color,
    m.full_name as agent_name,
    m.phone as agent_phone
FROM public.polling_units pu
LEFT JOIN public.wards w ON pu.ward_id = w.id
LEFT JOIN public.lgas l ON w.lga_id = l.id
LEFT JOIN public.members m ON pu.agent_id = m.id;

-- Create ward-level aggregation view
CREATE OR REPLACE VIEW ward_targets AS
SELECT 
    COALESCE(pu.ward_name, w.name) as ward_name,
    COALESCE(pu.lga_name, l.name) as lga_name,
    COUNT(pu.id) as total_polling_units,
    SUM(pu.target_voters) as total_target_voters,
    SUM(pu.registered_members) as total_registered_members,
    SUM(pu.verified_members) as total_verified_members,
    CASE 
        WHEN SUM(pu.target_voters) > 0 THEN 
            ROUND((SUM(pu.registered_members)::numeric / SUM(pu.target_voters)) * 100, 2)
        ELSE 0 
    END as ward_coverage_percentage,
    CASE 
        WHEN SUM(pu.registered_members) >= SUM(pu.target_voters) THEN 'green'
        WHEN SUM(pu.registered_members) >= (SUM(pu.target_voters) * 0.7) THEN 'yellow'
        ELSE 'red'
    END as ward_status
FROM public.polling_units pu
LEFT JOIN public.wards w ON pu.ward_id = w.id
LEFT JOIN public.lgas l ON w.lga_id = l.id
GROUP BY COALESCE(pu.ward_name, w.name), COALESCE(pu.lga_name, l.name);

-- Function to update polling unit member counts
CREATE OR REPLACE FUNCTION update_polling_unit_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update registered members count
    UPDATE public.polling_units 
    SET registered_members = (
        SELECT COUNT(*) 
        FROM public.members 
        WHERE polling_unit = pu.name OR polling_unit_id = pu.id
    ),
    verified_members = (
        SELECT COUNT(*) 
        FROM public.members 
        WHERE (polling_unit = pu.name OR polling_unit_id = pu.id) 
        AND status = 'verified'
    )
    FROM public.polling_units pu
    WHERE public.polling_units.id = pu.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update counts (optional - can be run manually too)
-- CREATE TRIGGER update_pu_counts_trigger
--     AFTER INSERT OR UPDATE ON public.members
--     FOR EACH ROW
--     EXECUTE FUNCTION update_polling_unit_counts();

-- Insert sample Katsina State polling units with coordinates
-- Note: These are approximate coordinates for demonstration
DO $$
DECLARE
    lga_record RECORD;
    ward_record RECORD;
    pu_counter INTEGER := 1;
BEGIN
    -- For each LGA
    FOR lga_record IN SELECT id, name FROM public.lgas WHERE name IN ('Katsina', 'Daura', 'Funtua', 'Malumfashi', 'Mani', 'Jibia', 'Dutsin-Ma', 'Dandume') LOOP
        -- Create 2-3 wards per LGA
        FOR ward_num IN 1..3 LOOP
            -- Create 3-5 polling units per ward
            FOR pu_num IN 1..4 LOOP
                INSERT INTO public.polling_units (
                    name,
                    code,
                    ward_id,
                    latitude,
                    longitude,
                    target_voters,
                    ward_name,
                    lga_name
                )
                SELECT 
                    lga_record.name || ' PU ' || pu_counter,
                    'PU-' || lpad(pu_counter::text, 4, '0'),
                    (SELECT id FROM public.wards WHERE lga_id = lga_record.id LIMIT 1 OFFSET (ward_num - 1)),
                    12.9908 + (random() - 0.5) * 0.5,
                    7.5965 + (random() - 0.5) * 0.5,
                    500,
                    lga_record.name || ' Ward ' || ward_num,
                    lga_record.name
                WHERE NOT EXISTS (
                    SELECT 1 FROM public.polling_units 
                    WHERE name = lga_record.name || ' PU ' || pu_counter
                );
                
                pu_counter := pu_counter + 1;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
