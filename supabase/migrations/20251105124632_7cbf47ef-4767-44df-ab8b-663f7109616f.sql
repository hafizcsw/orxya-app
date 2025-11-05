
-- Update vw_daily_metrics to use finance_entries instead of financial_events
DROP VIEW IF EXISTS public.vw_daily_metrics CASCADE;

CREATE OR REPLACE VIEW public.vw_daily_metrics AS
WITH days AS (
  SELECT generate_series::date AS day
  FROM generate_series(
    (now() AT TIME ZONE 'Asia/Dubai')::date - interval '60 days',
    (now() AT TIME ZONE 'Asia/Dubai')::date,
    interval '1 day'
  )
),
health AS (
  SELECT 
    user_id,
    day,
    steps,
    meters,
    hr_avg,
    hr_max,
    sleep_minutes
  FROM health_samples
),
fin AS (
  SELECT 
    owner_id AS user_id,
    entry_date AS day,
    SUM(CASE 
      WHEN type = 'income' THEN amount_usd 
      WHEN type = 'spend' THEN -amount_usd 
      ELSE 0 
    END)::numeric(18,2) AS net_cashflow,
    COUNT(*) FILTER (WHERE type = 'spend') AS expenses_count,
    COUNT(*) FILTER (WHERE type = 'income') AS incomes_count
  FROM finance_entries
  GROUP BY owner_id, entry_date
),
cal AS (
  SELECT 
    e.owner_id AS user_id,
    timezone('Asia/Dubai', e.starts_at)::date AS day,
    SUM(
      EXTRACT(epoch FROM 
        LEAST(e.ends_at, d.day::timestamp with time zone + interval '1 day') - 
        GREATEST(e.starts_at, d.day::timestamp with time zone)
      ) / 60
    )::integer AS busy_minutes
  FROM events e
  JOIN days d ON timezone('Asia/Dubai', e.starts_at)::date = d.day
  GROUP BY e.owner_id, timezone('Asia/Dubai', e.starts_at)::date
),
conf AS (
  SELECT 
    owner_id AS user_id,
    timezone('Asia/Dubai', created_at)::date AS day,
    COUNT(*) AS conflicts_count
  FROM conflicts
  GROUP BY owner_id, timezone('Asia/Dubai', created_at)::date
)
SELECT 
  u.id AS user_id,
  d.day,
  COALESCE(h.steps, 0) AS steps_total,
  COALESCE(h.meters, 0.0) AS meters_total,
  h.hr_avg,
  h.hr_max,
  h.sleep_minutes,
  COALESCE(c.busy_minutes, 0) AS busy_minutes,
  COALESCE(f.net_cashflow, 0.0)::numeric(18,2) AS net_cashflow,
  COALESCE(f.expenses_count, 0) AS expenses_count,
  COALESCE(f.incomes_count, 0) AS incomes_count,
  COALESCE(cf.conflicts_count, 0) AS conflicts_count
FROM auth.users u
CROSS JOIN days d
LEFT JOIN health h ON h.user_id = u.id AND h.day = d.day
LEFT JOIN fin f ON f.user_id = u.id AND f.day = d.day
LEFT JOIN cal c ON c.user_id = u.id AND c.day = d.day
LEFT JOIN conf cf ON cf.user_id = u.id AND cf.day = d.day;

-- Recreate materialized view
DROP MATERIALIZED VIEW IF EXISTS private.mv_daily_metrics CASCADE;

CREATE MATERIALIZED VIEW private.mv_daily_metrics AS
SELECT * FROM public.vw_daily_metrics;

-- Create index for performance
CREATE UNIQUE INDEX IF NOT EXISTS mv_daily_metrics_user_day_idx 
ON private.mv_daily_metrics (user_id, day);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW private.mv_daily_metrics;
