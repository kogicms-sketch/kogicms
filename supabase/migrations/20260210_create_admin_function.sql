-- Create a function to manually create a support group admin user
-- Run this in the Supabase SQL Editor

-- Enable pgcrypto for password hashing if not already enabled
create extension if not exists pgcrypto;

create or replace function create_support_group_admin(
  org_id uuid,
  admin_email text,
  admin_password text,
  admin_name text,
  admin_phone text default null
)
returns json
language plpgsql
security definer -- Important! Allows accessing auth schema
as $$
declare
  new_user_id uuid;
  encrypted_pw text;
begin
  -- 1. Check if user exists
  select id into new_user_id from auth.users where email = admin_email;
  
  if new_user_id is not null then
    return json_build_object('success', false, 'error', 'User with this email already exists');
  end if;

  -- 2. Generate Hash
  encrypted_pw := crypt(admin_password, gen_salt('bf'));
  new_user_id := gen_random_uuid();

  -- 3. Insert into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change_token,
    phone_change
  ) values (
    '00000000-0000-0000-0000-000000000000', -- Default instance_id
    new_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_pw,
    now(), -- Auto confirm email
    jsonb_build_object('full_name', admin_name),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  );

  -- 4. Insert into auth.identities
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_user_id, 
    new_user_id,
    jsonb_build_object('sub', new_user_id, 'email', admin_email),
    'email',
    admin_email,
    now(),
    now(),
    now()
  );

  -- 5. Public Profile and Role
  -- We use ON CONFLICT in case a trigger already created the profile
  insert into public.profiles (id, full_name, phone_number)
  values (new_user_id, admin_name, admin_phone)
  on conflict (id) do update
  set full_name = EXCLUDED.full_name, 
      phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);

  -- 5b. Assign Role in user_roles table
  insert into public.user_roles (user_id, role)
  values (new_user_id, 'org_admin')
  on conflict (user_id, role) do nothing;

  -- 6. Link to Organization
  insert into public.organization_admins (organization_id, user_id)
  values (org_id, new_user_id)
  on conflict (organization_id, user_id) do nothing;

  return json_build_object('success', true, 'user_id', new_user_id);
exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
