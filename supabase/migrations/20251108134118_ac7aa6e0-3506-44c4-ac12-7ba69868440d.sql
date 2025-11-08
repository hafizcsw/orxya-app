-- Ensure RLS is enabled on critical tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "read own events" ON public.events;
DROP POLICY IF EXISTS "insert own events" ON public.events;
DROP POLICY IF EXISTS "update own events" ON public.events;
DROP POLICY IF EXISTS "delete own events" ON public.events;

DROP POLICY IF EXISTS "read own financial events" ON public.financial_events;
DROP POLICY IF EXISTS "insert own financial events" ON public.financial_events;

-- Events table policies
CREATE POLICY "read own events"
ON public.events FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "insert own events"
ON public.events FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update own events"
ON public.events FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "delete own events"
ON public.events FOR DELETE
USING (owner_id = auth.uid());

-- Financial events policies (if not exists)
CREATE POLICY "read own financial events"
ON public.financial_events FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "insert own financial events"
ON public.financial_events FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Health samples policies are already correct (from schema)
-- Daily logs policies are already correct (from schema)

-- Ensure owner_id/user_id columns are NOT NULL where needed
-- Note: This is informational - these should already be NOT NULL based on schema