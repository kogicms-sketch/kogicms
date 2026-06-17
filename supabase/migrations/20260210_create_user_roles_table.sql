
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'org_admin', 'super_admin', 'user')),
  created_at timestamptz default now(),
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Policies
create policy "Users can view their own roles"
  on public.user_roles for select
  using (auth.uid() = user_id);

create policy "Admins can manage roles"
  on public.user_roles for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'super_admin'
    )
  );
