-- Fix 1: Add search_path to all SECURITY DEFINER functions
ALTER FUNCTION public.expand_instances(timestamp with time zone, timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.get_daily_metrics(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.get_engagement_metrics(uuid, date, date) SET search_path = public;
ALTER FUNCTION public.get_privacy_prefs(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_flags(uuid) SET search_path = public;
ALTER FUNCTION public.ingest_financial_event(uuid, timestamp with time zone, smallint, numeric, text, text, text, text, double precision, double precision) SET search_path = public;
ALTER FUNCTION public.init_privacy_prefs() SET search_path = public;
ALTER FUNCTION public.log_privacy_audit(uuid, text, jsonb) SET search_path = public;
ALTER FUNCTION public.refresh_daily_metrics(boolean) SET search_path = public;
ALTER FUNCTION public.refresh_engagement() SET search_path = public;
ALTER FUNCTION public.set_user_flag(uuid, text, boolean) SET search_path = public;
ALTER FUNCTION public.update_privacy_prefs(uuid, jsonb) SET search_path = public;

-- Fix 2: Move pg_trgm extension from public to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Fix 3: Move materialized views to private schema to hide from API
CREATE SCHEMA IF NOT EXISTS private;

-- Move materialized views to private schema
ALTER MATERIALIZED VIEW public.mv_daily_metrics SET SCHEMA private;
ALTER MATERIALIZED VIEW public.mv_engagement_daily SET SCHEMA private;
ALTER MATERIALIZED VIEW public.mv_event_instances SET SCHEMA private;

-- Update functions that reference these views
CREATE OR REPLACE FUNCTION public.get_daily_metrics(p_user_id uuid, p_start date, p_end date)
RETURNS TABLE(user_id uuid, day date, steps_total bigint, meters_total double precision, hr_avg double precision, hr_max double precision, sleep_minutes integer, busy_minutes integer, net_cashflow numeric, expenses_count bigint, incomes_count bigint, conflicts_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM private.mv_daily_metrics 
  WHERE mv_daily_metrics.user_id = p_user_id 
    AND mv_daily_metrics.day BETWEEN p_start AND p_end
  ORDER BY day DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_engagement_metrics(p_user_id uuid, p_start date, p_end date)
RETURNS TABLE(day date, events_count bigint, widget_taps bigint, tile_uses bigint, ai_plans bigint, ai_resolves bigint, ai_briefs bigint, page_views bigint, unique_features_used bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    day,
    events_count,
    widget_taps,
    tile_uses,
    ai_plans,
    ai_resolves,
    ai_briefs,
    page_views,
    unique_features_used
  FROM private.mv_engagement_daily
  WHERE user_id = p_user_id
    AND day BETWEEN p_start AND p_end
  ORDER BY day DESC;
$$;

CREATE OR REPLACE FUNCTION public.expand_instances(p_from timestamp with time zone, p_to timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_event_instances;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_daily_metrics(full_refresh boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_daily_metrics;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_engagement()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_engagement_daily;
$$;

-- Fix 4: Update storage policies to require authentication (not anonymous)
DROP POLICY IF EXISTS "الصور الشخصية يمكن رؤيتها من الجمي" ON storage.objects;
DROP POLICY IF EXISTS "المستخدم يمكنه تحديث صورته الشخصي" ON storage.objects;
DROP POLICY IF EXISTS "المستخدم يمكنه حذف صورته الشخصية" ON storage.objects;

-- New authenticated-only policies for avatars
CREATE POLICY "Authenticated users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);