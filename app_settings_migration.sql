-- Run this in the Lovable Cloud (Supabase) SQL editor to enable
-- global, realtime party-branding sync across all users.
-- Without this table, party selection still works locally per browser.

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_authenticated" on public.app_settings;
create policy "app_settings_select_authenticated"
  on public.app_settings for select to authenticated using (true);

drop policy if exists "app_settings_select_anon" on public.app_settings;
create policy "app_settings_select_anon"
  on public.app_settings for select to anon using (true);

drop policy if exists "app_settings_write_super_admin" on public.app_settings;
create policy "app_settings_write_super_admin"
  on public.app_settings for all to authenticated
  using (public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'super_admin'));

alter publication supabase_realtime add table public.app_settings;

insert into public.app_settings (key, value)
values ('active_party', '{"partyId":"apc"}'::jsonb)
on conflict (key) do nothing;
