-- Epic 7/10: Enable pg_cron and schedule materialized view refreshes

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily Metrics refresh (every 15 minutes)
SELECT cron.schedule(
  'refresh_daily_metrics_15m',
  '*/15 * * * *',
  $$SELECT public.refresh_daily_metrics(false);$$
);

-- Daily Metrics nightly full refresh (2:15 AM)
SELECT cron.schedule(
  'refresh_daily_metrics_nightly',
  '15 2 * * *',
  $$SELECT public.refresh_daily_metrics(true);$$
);

-- Engagement refresh (every 30 minutes)
SELECT cron.schedule(
  'refresh_engagement_30m',
  '*/30 * * * *',
  $$SELECT public.refresh_engagement();$$
);

-- Engagement nightly refresh (2:20 AM)
SELECT cron.schedule(
  'refresh_engagement_nightly',
  '20 2 * * *',
  $$SELECT public.refresh_engagement();$$
);
