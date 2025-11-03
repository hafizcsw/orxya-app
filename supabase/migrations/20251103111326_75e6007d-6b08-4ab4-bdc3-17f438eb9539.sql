-- Epic 10: Analytics Events + Engagement Metrics
-- Non-destructive, RLS-enabled, with TZ awareness

-- 1) Analytics events table
create table if not exists public.analytics_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in (
    'widget_tap', 'tile_plan', 'tile_focus', 'tile_add',
    'ai_plan', 'ai_resolve', 'ai_brief', 'budget_guard',
    'money_confirm', 'focus_toggle', 'privacy_export', 'privacy_toggle',
    'page_view', 'feature_use'
  )),
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists ae_rw on public.analytics_events;
create policy ae_rw on public.analytics_events
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_analytics_user_created 
  on public.analytics_events (user_id, created_at desc);

create index if not exists idx_analytics_kind 
  on public.analytics_events (kind, created_at desc);

-- 2) Daily engagement materialized view
drop materialized view if exists public.mv_engagement_daily cascade;
create materialized view public.mv_engagement_daily as
select 
  user_id,
  (timezone('Asia/Dubai', created_at))::date as day,
  count(*) as events_count,
  count(*) filter (where kind = 'widget_tap') as widget_taps,
  count(*) filter (where kind like 'tile_%') as tile_uses,
  count(*) filter (where kind = 'ai_plan') as ai_plans,
  count(*) filter (where kind = 'ai_resolve') as ai_resolves,
  count(*) filter (where kind = 'ai_brief') as ai_briefs,
  count(*) filter (where kind = 'page_view') as page_views,
  count(distinct kind) as unique_features_used
from public.analytics_events
group by user_id, day
with no data;

create unique index if not exists idx_mv_engagement_user_day 
  on public.mv_engagement_daily (user_id, day);

-- Initial data load
refresh materialized view public.mv_engagement_daily;

-- 3) Refresh function
create or replace function public.refresh_engagement()
returns void
language sql
security definer
as $$
  refresh materialized view concurrently public.mv_engagement_daily;
$$;
grant execute on function public.refresh_engagement() to authenticated;

-- 4) Query function with RLS
create or replace function public.get_engagement_metrics(
  p_user_id uuid,
  p_start date,
  p_end date
)
returns table(
  day date,
  events_count bigint,
  widget_taps bigint,
  tile_uses bigint,
  ai_plans bigint,
  ai_resolves bigint,
  ai_briefs bigint,
  page_views bigint,
  unique_features_used bigint
)
language sql
stable
security definer
as $$
  select 
    day,
    events_count,
    widget_taps,
    tile_uses,
    ai_plans,
    ai_resolves,
    ai_briefs,
    page_views,
    unique_features_used
  from public.mv_engagement_daily
  where user_id = p_user_id
    and day between p_start and p_end
  order by day desc;
$$;
grant execute on function public.get_engagement_metrics(uuid, date, date) to authenticated;