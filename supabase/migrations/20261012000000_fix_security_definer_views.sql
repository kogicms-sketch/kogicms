-- ============================================================================
-- Fix Security Definer View linter warnings for public views
-- Sets security_invoker = true on views to ensure Postgres enforces RLS policies
-- of the querying user rather than that of the view owner.
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'polling_unit_analytics'
    ) THEN
        ALTER VIEW public.polling_unit_analytics SET (security_invoker = true);
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'ward_targets'
    ) THEN
        ALTER VIEW public.ward_targets SET (security_invoker = true);
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'campaign_calendar'
    ) THEN
        ALTER VIEW public.campaign_calendar SET (security_invoker = true);
    END IF;
END $$;
