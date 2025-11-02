-- A) helper: تحديد المدراء من feature_flags
create or replace function public.is_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from feature_flags ff
    where ff.key = 'admin_users'
      and p_uid = any(ff.pilot_user_ids)
  );
$$;

-- B) فهارس أداء إضافية
create index if not exists idx_conflicts_owner_status_created
  on public.conflicts(owner_id, status, created_at desc);
create index if not exists idx_autopilot_actions_owner_time
  on public.autopilot_actions(owner_id, applied_at desc);

-- C) Views إدارية آمنة
create or replace view public.v_admin_conflict_kpis as
select
  date_trunc('day', now())::date as as_of_date,
  count(*) filter (where status='open')::int as open_now,
  count(*) filter (where status='suggested')::int as suggested_now,
  count(*) filter (where status='auto_applied')::int as auto_applied_now,
  count(*) filter (where status='resolved')::int as resolved_now,
  count(*) filter (where status='undone')::int as undone_now,
  count(*) filter (where created_at >= now() - interval '7 days' and status='auto_applied')::float as applied_7d,
  count(*) filter (where created_at >= now() - interval '7 days' and status='undone')::float as undone_7d,
  case
    when count(*) filter (where created_at >= now() - interval '7 days' and status='auto_applied') = 0
    then 0
    else
      count(*) filter (where created_at >= now() - interval '7 days' and status='undone')::float
      / nullif(count(*) filter (where created_at >= now() - interval '7 days' and status='auto_applied')::float,0)
  end as undo_rate_7d
from public.conflicts;

grant select on public.v_admin_conflict_kpis to authenticated;

create or replace function public.admin_conflict_kpis()
returns setof public.v_admin_conflict_kpis
language sql
stable
security definer
set search_path = public
as $$
  select * from public.v_admin_conflict_kpis
  where public.is_admin(auth.uid());
$$;

grant execute on function public.admin_conflict_kpis() to authenticated;

-- Daily series
create or replace view public.v_admin_actions_daily as
with days as (
  select generate_series::date d
  from generate_series(current_date - interval '29 days', current_date, interval '1 day')
)
select
  d.d as day,
  coalesce(count(*) filter (where aa.action='apply' and aa.applied_at::date = d.d),0)::int as applied,
  coalesce(count(*) filter (where aa.action='undo'  and aa.applied_at::date = d.d),0)::int as undone,
  coalesce(count(*) filter (where aa.action is not null and aa.applied_at::date = d.d),0)::int as total_actions
from days d
left join public.autopilot_actions aa
  on aa.applied_at::date = d.d
group by 1
order by 1;

grant select on public.v_admin_actions_daily to authenticated;

create or replace function public.admin_actions_daily()
returns setof public.v_admin_actions_daily
language sql
stable
security definer
set search_path = public
as $$
  select * from public.v_admin_actions_daily
  where public.is_admin(auth.uid());
$$;

grant execute on function public.admin_actions_daily() to authenticated;

-- Top reasons
create or replace view public.v_admin_top_reasons_30d as
select
  (conflicts.suggested_change->>'reason') as reason,
  count(*)::int as cnt
from public.conflicts
where created_at >= now() - interval '30 days'
group by 1
order by cnt desc
limit 20;

grant select on public.v_admin_top_reasons_30d to authenticated;

create or replace function public.admin_top_reasons_30d()
returns setof public.v_admin_top_reasons_30d
language sql
stable
security definer
set search_path = public
as $$
  select * from public.v_admin_top_reasons_30d
  where public.is_admin(auth.uid());
$$;

grant execute on function public.admin_top_reasons_30d() to authenticated;