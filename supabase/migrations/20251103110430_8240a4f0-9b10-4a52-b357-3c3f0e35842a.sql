-- Epic 7: ETL & Aggregates موحّد + TZ Guardrails
-- NON-DESTRUCTIVE: كل إضافات فقط

-- 1) HEALTH SAMPLES (سيرفر)
create table if not exists public.health_samples (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  steps bigint not null default 0,
  meters double precision not null default 0,
  hr_avg double precision,
  hr_max double precision,
  sleep_minutes integer,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- 2) FINANCIAL EVENTS (سيرفر) — سجلات عنصر-بعنصر
create table if not exists public.financial_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  when_at timestamptz not null,
  direction smallint not null check (direction in (-1, 1)),
  amount numeric(18,2) not null,
  currency text not null default 'AED',
  merchant text,
  source_pkg text,
  confidence smallint not null default 50 check (confidence between 0 and 100),
  place_name text,
  lat double precision,
  lng double precision,
  inserted_at timestamptz not null default now()
);

-- مفاتيح طبيعية للتخلّص من التكرار
create unique index if not exists uq_fin_ev_dedup
on public.financial_events (user_id, when_at, amount, currency, coalesce(source_pkg, ''));

-- 3) فهارس ضرورية للأداء
create index if not exists idx_fin_ev_day on public.financial_events ((timezone('Asia/Dubai', when_at)::date));
create index if not exists idx_fin_ev_user_when on public.financial_events (user_id, when_at);
create index if not exists idx_health_samples_user_day on public.health_samples (user_id, day);

-- 4) RLS
alter table public.health_samples enable row level security;
alter table public.financial_events enable row level security;

drop policy if exists health_samples_select on public.health_samples;
create policy health_samples_select on public.health_samples
  for select using (auth.uid() = user_id);

drop policy if exists health_samples_upsert on public.health_samples;
create policy health_samples_upsert on public.health_samples
  for insert with check (auth.uid() = user_id);

drop policy if exists health_samples_update on public.health_samples;
create policy health_samples_update on public.health_samples
  for update using (auth.uid() = user_id);

drop policy if exists financial_events_rw on public.financial_events;
create policy financial_events_rw on public.financial_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5) VIEW — اليوميات الموحّدة (بدون مادة)
create or replace view public.vw_daily_metrics as
with days as (
  select generate_series::date as day
  from generate_series((now() at time zone 'Asia/Dubai')::date - interval '60 days',
                       (now() at time zone 'Asia/Dubai')::date,
                       interval '1 day')
),
health as (
  select user_id, day, steps, meters, hr_avg, hr_max, sleep_minutes
  from public.health_samples
),
fin as (
  select
    user_id,
    (timezone('Asia/Dubai', when_at))::date as day,
    sum(direction * amount)::numeric(18,2) as net_cashflow,
    count(*) filter (where direction = -1) as expenses_count,
    count(*) filter (where direction = 1)  as incomes_count
  from public.financial_events
  group by 1,2
),
cal as (
  select
    owner_id as user_id,
    (timezone('Asia/Dubai', starts_at))::date as day,
    sum(extract(epoch from (least(ends_at, (day::timestamptz + interval '1 day')) 
           - greatest(starts_at, day::timestamptz)))/60)::int as busy_minutes
  from public.events e
  join days d on (timezone('Asia/Dubai', e.starts_at))::date = d.day
  group by 1,2
),
conf as (
  select owner_id as user_id, (timezone('Asia/Dubai', created_at))::date as day,
         count(*) as conflicts_count
  from public.conflicts
  group by 1,2
)
select
  u.id as user_id,
  d.day,
  coalesce(h.steps,0) as steps_total,
  coalesce(h.meters,0) as meters_total,
  h.hr_avg, h.hr_max, h.sleep_minutes,
  coalesce(c.busy_minutes,0) as busy_minutes,
  coalesce(f.net_cashflow,0)::numeric(18,2) as net_cashflow,
  coalesce(f.expenses_count,0) as expenses_count,
  coalesce(f.incomes_count,0) as incomes_count,
  coalesce(cf.conflicts_count,0) as conflicts_count
from auth.users u
cross join days d
left join health h on (h.user_id = u.id and h.day = d.day)
left join fin f on (f.user_id = u.id and f.day = d.day)
left join cal c on (c.user_id = u.id and c.day = d.day)
left join conf cf on (cf.user_id = u.id and cf.day = d.day);

-- 6) MATERIALIZED VIEW + فهارس
drop materialized view if exists public.mv_daily_metrics;
create materialized view public.mv_daily_metrics as
select * from public.vw_daily_metrics;

create unique index if not exists idx_mv_daily_metrics_user_day on public.mv_daily_metrics (user_id, day);

-- 7) دوال التحديث
create or replace function public.refresh_daily_metrics(full_refresh boolean default false)
returns void language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.mv_daily_metrics;
end $$;

-- 8) RPC المساعدة للـupsert
create or replace function public.ingest_financial_event(
  p_user_id uuid,
  p_when_at timestamptz,
  p_direction smallint,
  p_amount numeric,
  p_currency text default 'AED',
  p_merchant text default null,
  p_source_pkg text default null,
  p_place_name text default null,
  p_lat double precision default null,
  p_lng double precision default null
) returns void language plpgsql security definer as $$
begin
  insert into public.financial_events
    (user_id, when_at, direction, amount, currency, merchant, source_pkg, place_name, lat, lng)
  values
    (p_user_id, p_when_at, p_direction, p_amount, p_currency, p_merchant, p_source_pkg, p_place_name, p_lat, p_lng)
  on conflict (user_id, when_at, amount, currency, coalesce(source_pkg, ''))
  do update set
    direction = excluded.direction,
    merchant = coalesce(excluded.merchant, public.financial_events.merchant),
    place_name = coalesce(excluded.place_name, public.financial_events.place_name),
    lat = coalesce(excluded.lat, public.financial_events.lat),
    lng = coalesce(excluded.lng, public.financial_events.lng),
    inserted_at = now();
end $$;

grant execute on function public.ingest_financial_event to authenticated;

-- 9) وظيفة قراءة
create or replace function public.get_daily_metrics(p_user_id uuid, p_start date, p_end date)
returns table (
  user_id uuid,
  day date,
  steps_total bigint,
  meters_total double precision,
  hr_avg double precision,
  hr_max double precision,
  sleep_minutes integer,
  busy_minutes integer,
  net_cashflow numeric,
  expenses_count bigint,
  incomes_count bigint,
  conflicts_count bigint
)
language sql stable security definer as $$
  select * from public.mv_daily_metrics 
  where mv_daily_metrics.user_id = p_user_id 
    and mv_daily_metrics.day between p_start and p_end
  order by day desc;
$$;

grant execute on function public.get_daily_metrics to authenticated;