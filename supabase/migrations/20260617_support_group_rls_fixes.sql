-- RLS Policies to allow campaign leadership roles and authenticated users to view data
-- This ensures that roles like federal_rep, senatorial_leader, and house_assembly_member 
-- can view support groups, member counts, and activity logs on the geographical coverage map.

-- 1. Enable SELECT on support_group_activities for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all support group activities" ON public.support_group_activities;
CREATE POLICY "Authenticated users can view all support group activities" 
ON public.support_group_activities FOR SELECT 
TO authenticated 
USING (true);

-- 2. Enable SELECT on activities for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all general activities" ON public.activities;
CREATE POLICY "Authenticated users can view all general activities" 
ON public.activities FOR SELECT 
TO authenticated 
USING (true);

-- 3. Enable SELECT on members for all authenticated users
DROP POLICY IF EXISTS "Authenticated users can view all members" ON public.members;
CREATE POLICY "Authenticated users can view all members" 
ON public.members FOR SELECT 
TO authenticated 
USING (true);
