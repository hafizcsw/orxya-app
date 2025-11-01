-- بحث سريع للأحداث ضمن مدى زمني + نص
create index if not exists idx_events_owner_start on public.events(owner_id, starts_at);
create index if not exists idx_events_text on public.events using gin (to_tsvector('arabic', coalesce(title,'')));

-- بحث سريع للمهام بالنطاق الزمني والحالة
create index if not exists idx_tasks_owner_due on public.tasks(owner_id, due_date);
create index if not exists idx_tasks_status on public.tasks(owner_id, status);
create index if not exists idx_tasks_text on public.tasks using gin (to_tsvector('arabic', coalesce(title,'')));

-- View مساعدة لتجميع أسبوع/يوم
create or replace view public.vw_productivity_daily as
select
  owner_id,
  date(starts_at at time zone 'UTC') as day_utc,
  count(*) filter (where source_id = 'ai') as ai_events,
  count(*) as events_total
from public.events
group by 1, 2;