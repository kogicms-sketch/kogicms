-- ============================================================================
-- PUBLIC MEMBER REGISTRATION RLS POLICIES
-- Purpose: Enable anonymous visitors to register themselves and insert
--          notifications targeted to the relevant polling unit agent.
-- ============================================================================

-- 1. Members insert policy
DROP POLICY IF EXISTS "Allow public insert into members" ON public.members;
CREATE POLICY "Allow public insert into members" 
ON public.members 
FOR INSERT 
TO anon 
WITH CHECK (status = 'pending');

-- 2. Polling unit agents select policy (for notification routing)
DROP POLICY IF EXISTS "Allow public read of polling unit agents" ON public.polling_unit_agents;
CREATE POLICY "Allow public read of polling unit agents" 
ON public.polling_unit_agents 
FOR SELECT 
TO anon 
USING (is_active = true);

-- 3. Broadcast notifications insert policy
DROP POLICY IF EXISTS "Allow public insert into broadcast_notifications" ON public.broadcast_notifications;
CREATE POLICY "Allow public insert into broadcast_notifications" 
ON public.broadcast_notifications 
FOR INSERT 
TO anon 
WITH CHECK (type = 'alert');

-- 4. Notification recipients insert policy
DROP POLICY IF EXISTS "Allow public insert into notification_recipients" ON public.notification_recipients;
CREATE POLICY "Allow public insert into notification_recipients" 
ON public.notification_recipients 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- Reload Schema to notify PostgREST
NOTIFY pgrst, 'reload schema';
