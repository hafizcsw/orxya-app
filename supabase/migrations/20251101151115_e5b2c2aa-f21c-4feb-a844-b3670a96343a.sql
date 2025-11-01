-- إصلاح الـ view بإزالة SECURITY DEFINER
drop view if exists public.vw_productivity_daily;

create view public.vw_productivity_daily 
with (security_invoker = true)
as
select
  owner_id,
  date(starts_at at time zone 'UTC') as day_utc,
  count(*) filter (where source_id = 'ai') as ai_events,
  count(*) as events_total
from public.events
group by 1, 2;