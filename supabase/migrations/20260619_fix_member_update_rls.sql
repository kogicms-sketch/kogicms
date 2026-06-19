-- ============================================================================
-- FIX MEMBER UPDATE RLS & JURISDICTION HELPER FUNCTIONS
-- Purpose: Extend check_auth_jurisdiction to include federal reps, 
--          senatorial leaders, and house assembly members so they can update 
--          members within their constituencies.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL::text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'
  ) OR EXISTS (
    SELECT 1 FROM public.councillors WHERE user_id = auth.uid() AND lga = _lga AND (ward = _ward OR _ward IS NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.lga_chairmen WHERE user_id = auth.uid() AND lga = _lga
  ) OR EXISTS (
    SELECT 1 FROM public.federal_reps WHERE user_id = auth.uid() AND _lga = ANY(lga_list)
  ) OR EXISTS (
    SELECT 1 FROM public.senatorial_leaders WHERE user_id = auth.uid() AND _lga = ANY(lga_list)
  ) OR EXISTS (
    SELECT 1 FROM public.house_assembly_members WHERE user_id = auth.uid() AND lga = _lga
  );
$$;

CREATE OR REPLACE FUNCTION public.check_auth_jurisdiction(_lga text, _ward text DEFAULT NULL::text, _polling_unit text DEFAULT NULL::text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role::text = 'super_admin'
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
  ) OR EXISTS (
    SELECT 1 FROM public.federal_reps WHERE user_id = auth.uid() AND _lga = ANY(lga_list)
  ) OR EXISTS (
    SELECT 1 FROM public.senatorial_leaders WHERE user_id = auth.uid() AND _lga = ANY(lga_list)
  ) OR EXISTS (
    SELECT 1 FROM public.house_assembly_members WHERE user_id = auth.uid() AND lga = _lga
  );
$$;

-- Reload Schema to notify PostgREST
NOTIFY pgrst, 'reload schema';
