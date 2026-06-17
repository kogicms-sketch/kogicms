
-- 1. Ensure user_roles table exists and has correct schema
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);
-- Enable RLS
alter table public.user_roles enable row level security;

-- 2. Fix handle_new_user to be idempotent (fixes potential 500 errors on login if trigger fires on update)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name);
  return new;
end;
$$;

-- 3. Update create_support_group_admin to use user_roles and handle identities correctly
create or replace function create_support_group_admin(
  org_id uuid,
  admin_email text,
  admin_password text,
  admin_name text,
  admin_phone text default null
)
returns json
language plpgsql
security definer
as $$
declare
  new_user_id uuid;
  encrypted_pw text;
begin
  -- Check if user exists
  select id into new_user_id from auth.users where email = admin_email;
  
  if new_user_id is not null then
    return json_build_object('success', false, 'error', 'User with this email already exists');
  end if;

  -- Generate Hash and ID
  encrypted_pw := crypt(admin_password, gen_salt('bf'));
  new_user_id := gen_random_uuid();

  -- Insert into auth.users
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
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    admin_email,
    encrypted_pw,
    now(),
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

  -- Insert into auth.identities
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

  -- Ensure profile exists (handle_new_user trigger might have run, but we want to ensure phone/name is correct)
  insert into public.profiles (id, full_name, phone_number)
  values (new_user_id, admin_name, admin_phone)
  on conflict (id) do update
  set full_name = EXCLUDED.full_name, 
      phone_number = COALESCE(EXCLUDED.phone_number, public.profiles.phone_number);

  -- Assign Role in user_roles
  insert into public.user_roles (user_id, role)
  values (new_user_id, 'org_admin')
  on conflict (user_id, role) do nothing;

  -- Link to Organization
  insert into public.organization_admins (organization_id, user_id)
  values (org_id, new_user_id)
  on conflict (organization_id, user_id) do nothing;

  return json_build_object('success', true, 'user_id', new_user_id);
exception when others then
  return json_build_object('success', false, 'error', SQLERRM);
end;
$$;
