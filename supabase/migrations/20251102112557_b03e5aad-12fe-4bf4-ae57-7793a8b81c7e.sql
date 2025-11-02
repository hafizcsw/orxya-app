-- Patch 19.1: منظر موحد للأحداث مع التعارضات

-- View: أحداث مع عداد تعارضات الصلاة (مفتوحة) وأسماء الصلوات المتعارضة
create or replace view vw_events_conflicts as
select
  e.id,
  e.owner_id,
  e.title,
  e.starts_at,
  e.ends_at,
  e.description,
  e.source_id,
  e.tags,
  e.created_at,
  e.updated_at,
  coalesce(count(c.*) filter (where c.status = 'open'), 0)::int as conflict_open_count,
  coalesce(array_agg(distinct c.prayer_name) filter (where c.status = 'open'), '{}') as conflict_prayers
from events e
left join conflicts c
  on c.owner_id = e.owner_id
 and c.event_id = e.id
group by e.id, e.owner_id, e.title, e.starts_at, e.ends_at, e.description, e.source_id, e.tags, e.created_at, e.updated_at;