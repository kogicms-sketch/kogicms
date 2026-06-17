-- FORCE FIX SCRIPT
-- 1. Sync Phone Numbers from Auth Users
UPDATE public.profiles
SET phone_number = au.phone
FROM auth.users au
WHERE public.profiles.id = au.id
AND public.profiles.phone_number IS NULL
AND au.phone IS NOT NULL;

-- Also try metadata if phone is still null
UPDATE public.profiles
SET phone_number = au.raw_user_meta_data->>'phone_number'
FROM auth.users au
WHERE public.profiles.id = au.id
AND public.profiles.phone_number IS NULL
AND au.raw_user_meta_data->>'phone_number' IS NOT NULL;


-- 2. FORCE FIX RLS POLICIES (Drop and Recreate)
-- Drop to clear any broken states
DROP POLICY IF EXISTS "Super Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON profiles;

-- Recreate View Policy
CREATE POLICY "Super Admins can view all profiles" 
ON profiles FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
);

-- Recreate Update Policy
CREATE POLICY "Super Admins can update all profiles" 
ON profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'super_admin'
  )
);

-- 3. FIX ADMIN AUDIT LOGS TRIGGER PERMISSIONS
-- Ensure the function owner has permission (usually postgres is fine, but let's be safe)
GRANT INSERT ON public.admin_audit_logs TO postgres;
GRANT INSERT ON public.admin_audit_logs TO service_role;
GRANT INSERT ON public.admin_audit_logs TO authenticated; -- Needed if SECURITY DEFINER isn't working as expected

-- Add policy for INSERT just in case (though Trigger handles it)
DROP POLICY IF EXISTS "Admins can insert logs" ON admin_audit_logs;
CREATE POLICY "Admins can insert logs"
ON admin_audit_logs FOR INSERT
WITH CHECK (true); -- Triggers control the actual data, this just opens the door 

SELECT 'Fixes applied: Phones synced, Policies reset.' as status;
