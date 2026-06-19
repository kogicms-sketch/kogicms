-- Migration: 20260619_fix_wards_rls_policy.sql
-- Description: Add RLS select policy to wards table for authenticated users to allow Senator, Rep, and Assembly roles to load target destinations.

DROP POLICY IF EXISTS "Allow select to authenticated users" ON public.wards;
CREATE POLICY "Allow select to authenticated users" ON public.wards
    FOR SELECT TO authenticated
    USING (true);

NOTIFY pgrst, 'reload schema';
