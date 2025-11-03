-- Drop existing functions first to allow return type changes
DROP FUNCTION IF EXISTS public.admin_actions_daily() CASCADE;
DROP FUNCTION IF EXISTS public.admin_conflict_kpis() CASCADE;
DROP FUNCTION IF EXISTS public.admin_top_reasons_30d() CASCADE;

-- Ensure has_role() function exists and is properly configured
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = _role
  )
$$;

-- Remove SECURITY DEFINER from views to prevent auth.users exposure
DROP VIEW IF EXISTS v_admin_actions_daily CASCADE;
DROP VIEW IF EXISTS v_admin_conflict_kpis CASCADE;
DROP VIEW IF EXISTS v_admin_top_reasons_30d CASCADE;

-- Recreate views as SECURITY INVOKER (safer, prevents privilege escalation)
CREATE OR REPLACE VIEW v_admin_actions_daily 
WITH (security_invoker = true)
AS
SELECT
  applied_at::date AS day,
  COUNT(*)::integer AS total_actions,
  COUNT(*) FILTER (WHERE action = 'apply')::integer AS applied,
  COUNT(*) FILTER (WHERE undo_token IS NOT NULL)::integer AS undone
FROM autopilot_actions
WHERE applied_at > NOW() - INTERVAL '90 days'
GROUP BY applied_at::date
ORDER BY day DESC;

CREATE OR REPLACE VIEW v_admin_conflict_kpis
WITH (security_invoker = true)
AS
SELECT
  CURRENT_DATE AS as_of_date,
  COUNT(*) FILTER (WHERE status = 'open')::integer AS open_now,
  COUNT(*) FILTER (WHERE status = 'resolved')::integer AS resolved_now,
  COUNT(*) FILTER (WHERE suggested_action IS NOT NULL)::integer AS suggested_now,
  (SELECT COUNT(*)::integer FROM autopilot_actions WHERE applied_at > NOW() - INTERVAL '7 days') AS auto_applied_now,
  COUNT(*) FILTER (WHERE resolution = 'undone')::integer AS undone_now,
  (SELECT AVG(CASE WHEN action = 'apply' THEN 1.0 ELSE 0.0 END) 
   FROM autopilot_actions 
   WHERE applied_at > NOW() - INTERVAL '7 days') AS applied_7d,
  (SELECT AVG(CASE WHEN undo_token IS NOT NULL THEN 1.0 ELSE 0.0 END)
   FROM autopilot_actions
   WHERE applied_at > NOW() - INTERVAL '7 days') AS undone_7d,
  CASE 
    WHEN (SELECT COUNT(*) FROM autopilot_actions WHERE applied_at > NOW() - INTERVAL '7 days') > 0
    THEN (SELECT COUNT(*) FILTER (WHERE undo_token IS NOT NULL)::double precision 
          FROM autopilot_actions 
          WHERE applied_at > NOW() - INTERVAL '7 days') / 
         (SELECT COUNT(*)::double precision 
          FROM autopilot_actions 
          WHERE applied_at > NOW() - INTERVAL '7 days')
    ELSE 0.0
  END AS undo_rate_7d
FROM conflicts;

CREATE OR REPLACE VIEW v_admin_top_reasons_30d
WITH (security_invoker = true)
AS
SELECT
  suggested_action AS reason,
  COUNT(*)::integer AS cnt
FROM conflicts
WHERE created_at > NOW() - INTERVAL '30 days'
  AND suggested_action IS NOT NULL
GROUP BY suggested_action
ORDER BY cnt DESC
LIMIT 10;

-- Create secure admin RPC functions with proper role authorization
CREATE OR REPLACE FUNCTION public.admin_actions_daily()
RETURNS TABLE (
  day date,
  total_actions integer,
  applied integer,
  undone integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT day, total_actions, applied, undone
  FROM v_admin_actions_daily
  WHERE public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.admin_conflict_kpis()
RETURNS TABLE (
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
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM v_admin_conflict_kpis
  WHERE public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.admin_top_reasons_30d()
RETURNS TABLE (
  reason text,
  cnt integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT reason, cnt
  FROM v_admin_top_reasons_30d
  WHERE public.has_role(auth.uid(), 'admin');
$$;