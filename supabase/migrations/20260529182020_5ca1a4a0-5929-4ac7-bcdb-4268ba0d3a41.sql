CREATE OR REPLACE VIEW public.voter_pu_counts AS
SELECT
  ward,
  polling_unit_code,
  max(polling_unit_name) AS polling_unit_name,
  count(*)::int AS registered_count
FROM public.voter_registry
GROUP BY ward, polling_unit_code;

GRANT SELECT ON public.voter_pu_counts TO anon;
GRANT SELECT ON public.voter_pu_counts TO authenticated;
GRANT SELECT ON public.voter_pu_counts TO service_role;