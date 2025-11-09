-- Command-Final: Views موحدة مع البنية الفعلية لـsignals_daily

-- signals_daily يستخدم metric/value structure
-- نحتاج pivot للحصول على الأعمدة

-- A.1 View صحي موحد يجمع metrics من signals_daily
create or replace view public.v_health_today as
with pivoted as (
  select
    user_id,
    date,
    max(case when metric = 'steps' then value::bigint else null end) as steps,
    max(case when metric = 'meters' then value::double precision else null end) as meters,
    max(case when metric = 'hr_avg' then value::double precision else null end) as hr_avg,
    max(case when metric = 'hr_max' then value::double precision else null end) as hr_max,
    max(case when metric = 'sleep_minutes' then value::integer else null end) as sleep_minutes,
    max(case when metric = 'recovery_percent' then value::smallint else null end) as recovery_percent,
    max(case when metric = 'strain_score' then value::numeric(4,2) else null end) as strain_score,
    max(hrv_z) as hrv_z  -- hrv_z موجود كعمود مباشر
  from public.signals_daily
  group by user_id, date
)
select
  p.user_id,
  p.date,
  p.recovery_percent,
  -- حساب sleep_score من sleep_minutes (0-8h → 0-100)
  case 
    when p.sleep_minutes is not null then 
      least(100, greatest(0, round((p.sleep_minutes::numeric / 480) * 100)))::smallint
    else null
  end as sleep_score,
  p.strain_score,
  coalesce(a.walk_minutes, 0) as walk_minutes,
  p.hrv_z,
  p.steps,
  p.meters,
  p.hr_avg,
  p.hr_max,
  p.sleep_minutes
from pivoted p
left join public.vw_today_activities a
  on a.user_id = p.user_id and a.day = p.date;

grant select on public.v_health_today to authenticated;

-- A.2 View مالية مع اتجاهات اليوم
create or replace view public.v_finance_today as
with today as (
  select
    user_id,
    (when_at at time zone 'UTC')::date as day,
    sum(case when direction = 1 then amount else 0 end) as income,
    sum(case when direction = -1 then amount else 0 end) as expenses
  from public.financial_events
  where when_at >= current_date - interval '2 days'
  group by user_id, (when_at at time zone 'UTC')::date
),
pair as (
  select
    t.user_id,
    t.day,
    t.income,
    t.expenses,
    coalesce(lag(t.income) over (partition by t.user_id order by t.day), 0) as income_prev,
    coalesce(lag(t.expenses) over (partition by t.user_id order by t.day), 0) as expenses_prev
  from today t
)
select
  user_id,
  day,
  income::numeric as income,
  expenses::numeric as expenses,
  (income - expenses)::numeric as balance,
  case when income_prev > 0 
       then round(((income - income_prev) / income_prev) * 100, 1) 
  end as income_trend_pct,
  case when expenses_prev > 0 
       then round(((expenses - expenses_prev) / expenses_prev) * 100, 1) 
  end as expenses_trend_pct,
  case when (income_prev - expenses_prev) <> 0
       then round((((income - expenses) - (income_prev - expenses_prev)) 
                   / nullif((income_prev - expenses_prev), 0)) * 100, 1)
  end as balance_trend_pct
from pair;

grant select on public.v_finance_today to authenticated;

-- A.3 RPC تغليف للـViews
create or replace function public.get_health_today(p_day date)
returns table(
  recovery_percent smallint,
  sleep_score smallint,
  strain_score numeric,
  walk_minutes integer,
  hrv_z double precision,
  steps bigint,
  meters double precision,
  hr_avg double precision,
  hr_max double precision,
  sleep_minutes integer
)
language sql security invoker as $$
  select 
    recovery_percent, 
    sleep_score, 
    strain_score, 
    walk_minutes, 
    hrv_z,
    steps,
    meters,
    hr_avg,
    hr_max,
    sleep_minutes
  from public.v_health_today
  where user_id = auth.uid() and date = p_day
  limit 1;
$$;

create or replace function public.get_finance_today(p_day date)
returns table(
  income numeric,
  expenses numeric,
  balance numeric,
  income_trend_pct numeric,
  expenses_trend_pct numeric,
  balance_trend_pct numeric
)
language sql security invoker as $$
  select 
    income, 
    expenses, 
    balance, 
    income_trend_pct, 
    expenses_trend_pct, 
    balance_trend_pct
  from public.v_finance_today
  where user_id = auth.uid() and day = p_day
  limit 1;
$$;

grant execute on function public.get_health_today(date) to authenticated;
grant execute on function public.get_finance_today(date) to authenticated;

-- تأكيد feature flags
insert into public.feature_flags(key, enabled) values
('FF_HEALTH_V2', true),
('FF_FINANCE_REAL', true)
on conflict (key) do update set enabled = excluded.enabled;