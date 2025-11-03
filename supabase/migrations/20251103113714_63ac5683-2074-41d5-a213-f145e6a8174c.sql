-- Epic 7/10: Add guard to prevent duplicate cron job scheduling (fixed syntax)

DO $$
BEGIN
  -- Daily Metrics refresh (every 15 minutes)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_daily_metrics_15m') THEN
    PERFORM cron.schedule(
      'refresh_daily_metrics_15m',
      '*/15 * * * *',
      'SELECT public.refresh_daily_metrics(false);'
    );
  END IF;

  -- Daily Metrics nightly full refresh (2:15 AM)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_daily_metrics_nightly') THEN
    PERFORM cron.schedule(
      'refresh_daily_metrics_nightly',
      '15 2 * * *',
      'SELECT public.refresh_daily_metrics(true);'
    );
  END IF;

  -- Engagement refresh (every 30 minutes)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_engagement_30m') THEN
    PERFORM cron.schedule(
      'refresh_engagement_30m',
      '*/30 * * * *',
      'SELECT public.refresh_engagement();'
    );
  END IF;

  -- Engagement nightly refresh (2:20 AM)
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh_engagement_nightly') THEN
    PERFORM cron.schedule(
      'refresh_engagement_nightly',
      '20 2 * * *',
      'SELECT public.refresh_engagement();'
    );
  END IF;
END $$;
