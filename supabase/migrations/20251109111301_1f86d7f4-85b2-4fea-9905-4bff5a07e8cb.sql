-- ====== أمر 1: الصحة - إضافة hrv_z ====== 
alter table public.signals_daily
  add column if not exists hrv_z double precision;

create index if not exists idx_signals_daily_user_date
  on public.signals_daily (user_id, date);

-- ====== أمر 2: المالية - فهارس ====== 
create index if not exists idx_fin_events_user_time
  on public.financial_events (user_id, when_at);

-- ====== أمر 3: الأنشطة - View موحد ====== 
-- حذف الـView القديم أولاً إن وُجد
drop view if exists public.vw_today_activities cascade;

-- إنشاء View جديد
create view public.vw_today_activities as
select
  e.owner_id as user_id,
  (e.starts_at at time zone 'utc')::date as day,
  coalesce(sum(
    extract(epoch from (
      least(e.ends_at, (date_trunc('day', e.starts_at) + interval '1 day')::timestamptz)
      - greatest(e.starts_at, date_trunc('day', e.starts_at))
    ))/3600.0
  ) filter (where 'work' = any(e.tags)), 0) as work_hours,
  coalesce(sum(
    extract(epoch from (
      least(e.ends_at, (date_trunc('day', e.starts_at) + interval '1 day')::timestamptz)
      - greatest(e.starts_at, date_trunc('day', e.starts_at))
    ))/3600.0
  ) filter (where 'study' = any(e.tags)), 0) as study_hours,
  coalesce(sum(
    extract(epoch from (
      least(e.ends_at, (date_trunc('day', e.starts_at) + interval '1 day')::timestamptz)
      - greatest(e.starts_at, date_trunc('day', e.starts_at))
    ))/3600.0
  ) filter (where 'sports' = any(e.tags) or 'mma' = any(e.tags)), 0) as sports_hours,
  coalesce(sum(
    extract(epoch from (
      least(e.ends_at, (date_trunc('day', e.starts_at) + interval '1 day')::timestamptz)
      - greatest(e.starts_at, date_trunc('day', e.starts_at))
    ))/60.0
  ) filter (where 'walk' = any(e.tags)), 0) as walk_minutes
from public.events e
where e.deleted_at is null
group by e.owner_id, (e.starts_at at time zone 'utc')::date;

alter view public.vw_today_activities owner to postgres;
grant select on public.vw_today_activities to authenticated;

-- ====== أمر 4: Feature Flags ======
create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.feature_flags enable row level security;

drop policy if exists "read_all_flags" on public.feature_flags;
create policy "read_all_flags" on public.feature_flags
  for select using (true);

insert into public.feature_flags(key, enabled) values
('FF_AI_INSIGHTS', false),
('FF_HEALTH_V2', true),
('FF_FINANCE_REAL', false)
on conflict (key) do update set 
  enabled = excluded.enabled,
  updated_at = now();