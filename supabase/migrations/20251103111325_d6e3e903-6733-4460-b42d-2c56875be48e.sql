-- Epic 10: Feature Flags Console + Pilot Users
-- Non-destructive, RLS-enabled

-- 1) User-specific feature flag overrides
create table if not exists public.user_feature_flags (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flags jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_feature_flags enable row level security;

drop policy if exists uff_rw on public.user_feature_flags;
create policy uff_rw on public.user_feature_flags
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) Pilot users for staged rollout
create table if not exists public.pilot_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cohort text not null default 'internal' check (cohort in ('internal', '5pct', '25pct', '100pct')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pilot_users enable row level security;

drop policy if exists pilot_sel on public.pilot_users;
create policy pilot_sel on public.pilot_users
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists pilot_ins on public.pilot_users;
create policy pilot_ins on public.pilot_users
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists pilot_upd on public.pilot_users;
create policy pilot_upd on public.pilot_users
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) Helper functions for flag resolution
create or replace function public.get_user_flags(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  global_flags jsonb;
  user_overrides jsonb;
  merged jsonb;
begin
  -- Get global flags from feature_flags table
  select jsonb_object_agg(key, enabled) into global_flags
  from public.feature_flags;

  -- Get user-specific overrides
  select flags into user_overrides
  from public.user_feature_flags
  where user_id = p_user_id;

  -- Merge: user overrides take precedence
  merged := coalesce(global_flags, '{}'::jsonb);
  if user_overrides is not null then
    merged := merged || user_overrides;
  end if;

  return merged;
end;
$$;
grant execute on function public.get_user_flags(uuid) to authenticated;

create or replace function public.set_user_flag(p_user_id uuid, p_key text, p_value boolean)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.user_feature_flags (user_id, flags, updated_at)
  values (p_user_id, jsonb_build_object(p_key, p_value), now())
  on conflict (user_id) do update set
    flags = jsonb_set(
      public.user_feature_flags.flags,
      array[p_key],
      to_jsonb(p_value),
      true
    ),
    updated_at = now();
end;
$$;
grant execute on function public.set_user_flag(uuid, text, boolean) to authenticated;