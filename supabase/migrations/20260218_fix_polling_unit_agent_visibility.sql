-- ============================================================================
-- FIX POLLING UNIT AGENT VISIBILITY
-- Purpose: Allow polling unit agents to view polling units
-- Issue: No RLS policy exists for polling_unit_agent role on polling_units table
-- ============================================================================

-- Add RLS policy for polling unit agents to view ONLY their assigned polling unit
-- Agents can only see the polling unit they are assigned to in polling_unit_agents table
DROP POLICY IF EXISTS "Polling unit agents can view polling units" ON public.polling_units;
CREATE POLICY "Polling unit agents can view polling units" ON public.polling_units
FOR SELECT TO authenticated
USING (
  get_auth_role() = 'polling_unit_agent' AND
  EXISTS (
    SELECT 1 FROM public.polling_unit_agents
    WHERE user_id = auth.uid()
    AND polling_unit_id = polling_units.id
  )
);

-- Reload schema
NOTIFY pgrst, 'reload schema';
