-- Grant super_admin role to lmd2027@gmail.com if not already present
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Find the user by email
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'lmd2027@gmail.com';

  -- If user exists, assign role
  IF target_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Also ensure they have a profile verification if needed (optional but good for testing)
    UPDATE public.profiles SET is_verified = true WHERE id = target_user_id;
  END IF;
END $$;
