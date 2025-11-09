-- Create view for today's financial summary with trends
create or replace view public.v_finance_today as
with daily_totals as (
  select
    user_id,
    date_trunc('day', when_at at time zone 'UTC')::date as day,
    sum(case when direction = 1 then amount else 0 end) as income,
    sum(case when direction = -1 then amount else 0 end) as expenses
  from public.financial_events
  group by user_id, day
),
with_previous as (
  select
    user_id,
    day,
    income,
    expenses,
    lag(income) over (partition by user_id order by day) as income_prev,
    lag(expenses) over (partition by user_id order by day) as expenses_prev
  from daily_totals
)
select
  user_id,
  day,
  income::numeric as income,
  expenses::numeric as expenses,
  (income - expenses)::numeric as balance,
  case 
    when income_prev > 0 then round(((income - income_prev) / income_prev) * 100, 1)
    else null
  end as income_trend_pct,
  case 
    when expenses_prev > 0 then round(((expenses - expenses_prev) / expenses_prev) * 100, 1)
    else null
  end as expenses_trend_pct,
  case 
    when (income_prev - expenses_prev) != 0 then 
      round((((income - expenses) - (income_prev - expenses_prev)) / nullif(income_prev - expenses_prev, 0)) * 100, 1)
    else null
  end as balance_trend_pct
from with_previous
where day = current_date;

-- Grant access to authenticated users
grant select on public.v_finance_today to authenticated;