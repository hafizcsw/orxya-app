-- Epic 9: Privacy Center + Audit Tables (Fixed)
-- Non-destructive, RLS-enabled

-- 1) User Privacy Preferences
create table if not exists public.user_privacy_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  health_enabled boolean not null default true,
  calendar_enabled boolean not null default true,
  notif_fin_enabled boolean not null default true,
  location_enabled boolean not null default true,
  pause_all boolean not null default false,
  retention_days int not null default 90 check (retention_days in (30, 90, 180, 365)),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.user_privacy_prefs enable row level security;

-- RLS Policy
drop policy if exists privacy_rw on public.user_privacy_prefs;
create policy privacy_rw on public.user_privacy_prefs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Privacy Audit Log
create table if not exists public.privacy_audit (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('toggle_on', 'toggle_off', 'export', 'request_delete', 'retention_change', 'pause_all_on', 'pause_all_off')),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.privacy_audit enable row level security;

-- RLS Policy
drop policy if exists privacy_audit_rw on public.privacy_audit;
create policy privacy_audit_rw on public.privacy_audit
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for performance
create index if not exists idx_privacy_audit_user_created 
  on public.privacy_audit (user_id, created_at desc);

-- Helper function: Initialize privacy prefs for new users
create or replace function public.init_privacy_prefs()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.user_privacy_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Trigger to auto-create privacy prefs on user signup
drop trigger if exists on_auth_user_created_privacy on auth.users;
create trigger on_auth_user_created_privacy
  after insert on auth.users
  for each row
  execute function public.init_privacy_prefs();