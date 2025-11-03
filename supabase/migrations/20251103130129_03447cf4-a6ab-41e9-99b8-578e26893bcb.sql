-- 1) جدول التقاويم المنطقية (مصادر متعددة)
create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  source text not null check (source in ('local','external','ai','prayer')),
  provider text,
  color text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

alter table public.calendars enable row level security;

create policy "Users manage their calendars"
  on public.calendars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) إضافة حقول للأحداث (RRULE واستثناءات)
alter table public.events
  add column if not exists calendar_id uuid references public.calendars(id),
  add column if not exists rrule text,
  add column if not exists exdates timestamptz[],
  add column if not exists is_draft boolean default false,
  add column if not exists travel_minutes int default 0,
  add column if not exists buffer_before int default 0,
  add column if not exists buffer_after int default 0;

-- 3) جدول الحضور/المدعوين
create table if not exists public.event_attendees (
  event_id uuid references public.events(id) on delete cascade,
  email text not null,
  name text,
  status text check (status in ('accepted','declined','tentative','needsAction')),
  primary key (event_id, email)
);

alter table public.event_attendees enable row level security;

create policy "Users manage attendees of their events"
  on public.event_attendees for all
  using (
    exists (
      select 1 from public.events 
      where events.id = event_attendees.event_id 
      and events.owner_id = auth.uid()
    )
  );

-- 4) جدول ساعات العمل
create table if not exists public.working_hours (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mon int4range,
  tue int4range,
  wed int4range,
  thu int4range,
  fri int4range,
  sat int4range,
  sun int4range,
  tz text not null default 'Asia/Dubai',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.working_hours enable row level security;

create policy "Users manage their working hours"
  on public.working_hours for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) جدول مواقع العمل
create table if not exists public.working_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  today text,
  tomorrow text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.working_locations enable row level security;

create policy "Users manage their working locations"
  on public.working_locations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6) Materialized View للمثيلات (نافذة 60 يوم)
create materialized view if not exists public.mv_event_instances as
select 
  e.id as event_id,
  e.calendar_id,
  e.starts_at as instance_start,
  e.ends_at as instance_end,
  e.title,
  e.location,
  e.tags,
  e.is_draft,
  e.external_source as source,
  e.external_source as provider,
  e.owner_id,
  e.travel_minutes,
  e.buffer_before,
  e.buffer_after
from public.events e
where e.deleted_at is null
  and e.starts_at >= now() - interval '1 day'
  and e.starts_at <= now() + interval '60 days';

create unique index if not exists idx_mv_instances_unique
  on public.mv_event_instances (event_id, instance_start);

create index if not exists idx_mv_instances_window
  on public.mv_event_instances (instance_start, instance_end);

create index if not exists idx_mv_instances_owner
  on public.mv_event_instances (owner_id, instance_start);

-- 7) دالة تحديث المثيلات
create or replace function public.expand_instances(p_from timestamptz, p_to timestamptz)
returns void
language plpgsql
security definer
as $$
begin
  refresh materialized view concurrently public.mv_event_instances;
end $$;

-- 8) Feature flags للتقويم
insert into public.feature_flags (key, enabled)
values 
  ('ff_calendar_instances', false),
  ('ff_calendar_nlp', false),
  ('ff_calendar_find_time', false),
  ('ff_calendar_overlays', true),
  ('ff_calendar_mobile', false)
on conflict (key) do nothing;