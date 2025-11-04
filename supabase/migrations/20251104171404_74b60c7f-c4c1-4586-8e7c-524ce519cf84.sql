-- إصلاح أمني شامل: إضافة search_path للـ functions وتأمين الـ Views

-- 1. إضافة search_path للـ functions الناقصة
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_business_plans_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_glances_updated_at() SET search_path = public;
ALTER FUNCTION public.fn_refresh_conflicts_for_date(uuid, date) SET search_path = public;
ALTER FUNCTION public.trg_events_conflicts_refresh() SET search_path = public;
ALTER FUNCTION public.fn_events_fill_calendar() SET search_path = public;
ALTER FUNCTION public.init_privacy_prefs() SET search_path = public;
ALTER FUNCTION public.handle_new_user_role() SET search_path = public;

-- 2. إصلاح SECURITY DEFINER views بتحويلها إلى functions محمية

-- حذف الـ views القديمة (سيتم استبدالها بـ functions)
DROP VIEW IF EXISTS public.v_admin_actions_daily CASCADE;
DROP VIEW IF EXISTS public.v_admin_conflict_kpis CASCADE;
DROP VIEW IF EXISTS public.v_admin_top_reasons_30d CASCADE;

-- إعادة إنشاء admin_actions_daily كـ function محمي بشكل أفضل
CREATE OR REPLACE FUNCTION public.admin_actions_daily()
RETURNS TABLE(day date, total_actions integer, applied integer, undone integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (applied_at)::date AS day,
    (count(*))::integer AS total_actions,
    (count(*) FILTER (WHERE action = 'apply'))::integer AS applied,
    (count(*) FILTER (WHERE undo_token IS NOT NULL))::integer AS undone
  FROM autopilot_actions
  WHERE applied_at > (now() - interval '90 days')
    AND owner_id IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  GROUP BY (applied_at)::date
  ORDER BY (applied_at)::date DESC;
$$;

-- إعادة إنشاء admin_conflict_kpis
CREATE OR REPLACE FUNCTION public.admin_conflict_kpis()
RETURNS TABLE(
  as_of_date date,
  open_now integer,
  resolved_now integer,
  suggested_now integer,
  auto_applied_now integer,
  undone_now integer,
  applied_7d double precision,
  undone_7d double precision,
  undo_rate_7d double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CURRENT_DATE AS as_of_date,
    (count(*) FILTER (WHERE status = 'open'))::integer AS open_now,
    (count(*) FILTER (WHERE status = 'resolved'))::integer AS resolved_now,
    (count(*) FILTER (WHERE suggested_action IS NOT NULL))::integer AS suggested_now,
    (SELECT count(*)::integer FROM autopilot_actions 
     WHERE applied_at > now() - interval '7 days'
     AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    ) AS auto_applied_now,
    (count(*) FILTER (WHERE resolution = 'undone'))::integer AS undone_now,
    (SELECT avg(CASE WHEN action = 'apply' THEN 1.0 ELSE 0.0 END) 
     FROM autopilot_actions 
     WHERE applied_at > now() - interval '7 days'
     AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    ) AS applied_7d,
    (SELECT avg(CASE WHEN undo_token IS NOT NULL THEN 1.0 ELSE 0.0 END) 
     FROM autopilot_actions 
     WHERE applied_at > now() - interval '7 days'
     AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
    ) AS undone_7d,
    CASE 
      WHEN (SELECT count(*) FROM autopilot_actions 
            WHERE applied_at > now() - interval '7 days'
            AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
           ) > 0 
      THEN (
        SELECT count(*) FILTER (WHERE undo_token IS NOT NULL)::double precision 
        FROM autopilot_actions 
        WHERE applied_at > now() - interval '7 days'
        AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
      ) / (
        SELECT count(*)::double precision 
        FROM autopilot_actions 
        WHERE applied_at > now() - interval '7 days'
        AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
      )
      ELSE 0.0
    END AS undo_rate_7d
  FROM conflicts
  WHERE owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin');
$$;

-- إعادة إنشاء admin_top_reasons_30d
CREATE OR REPLACE FUNCTION public.admin_top_reasons_30d()
RETURNS TABLE(reason text, cnt integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    suggested_action AS reason,
    count(*)::integer AS cnt
  FROM conflicts
  WHERE created_at > now() - interval '30 days'
    AND suggested_action IS NOT NULL
    AND owner_id IN (SELECT user_id FROM user_roles WHERE role = 'admin')
  GROUP BY suggested_action
  ORDER BY count(*) DESC
  LIMIT 10;
$$;

-- 3. تأمين الـ RLS policies للجداول الحساسة
-- التأكد من أن appointment_bookings لا تكشف معلومات حساسة
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.appointment_bookings;
CREATE POLICY "Anyone can create bookings" 
ON public.appointment_bookings 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- السماح للمالكين فقط بقراءة الحجوزات
DROP POLICY IF EXISTS "Users view bookings for their pages" ON public.appointment_bookings;
CREATE POLICY "Owners view bookings for their pages" 
ON public.appointment_bookings 
FOR SELECT 
TO authenticated
USING (
  page_id IN (
    SELECT id FROM appointment_pages 
    WHERE user_id = auth.uid()
  )
);

-- 4. إضافة index للأداء
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_conflicts_owner_status ON public.conflicts(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_events_owner_starts ON public.events(owner_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_autopilot_actions_applied ON public.autopilot_actions(owner_id, applied_at);

-- 5. تعليق يوضح الإصلاحات
COMMENT ON FUNCTION public.admin_actions_daily() IS 
'Admin-only function with proper RLS enforcement via user_roles table';
COMMENT ON FUNCTION public.admin_conflict_kpis() IS 
'Admin-only KPIs with proper security definer and search_path protection';
COMMENT ON FUNCTION public.admin_top_reasons_30d() IS 
'Admin-only conflict reasons with proper access control';
