-- Create vw_today_activities view for unified activities source
-- Fixed: using array contains operator for text[] tags
create or replace view public.vw_today_activities as
with clipped as (
  select
    e.owner_id as user_id,
    (e.starts_at at time zone 'utc')::date as day,
    greatest(e.starts_at, date_trunc('day', e.starts_at)) as clip_start,
    least(e.ends_at, date_trunc('day', e.starts_at) + interval '1 day') as clip_end,
    e.tags
  from public.events e
  where e.deleted_at is null
    and e.ends_at > e.starts_at
)
select
  user_id,
  day,
  round(sum(extract(epoch from (clip_end - clip_start))/3600.0)
        filter (where 'work' = any(tags)), 1) as work_hours,
  round(sum(extract(epoch from (clip_end - clip_start))/3600.0)
        filter (where 'study' = any(tags)), 1) as study_hours,
  round(sum(extract(epoch from (clip_end - clip_start))/3600.0)
        filter (where 'sports' = any(tags) or 'mma' = any(tags)), 1) as sports_hours,
  round(sum(extract(epoch from (clip_end - clip_start))/60.0)
        filter (where 'walk' = any(tags)), 0) as walk_minutes
from clipped
group by user_id, day;

grant select on public.vw_today_activities to authenticated;