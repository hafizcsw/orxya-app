-- OAuth states table for PKCE/STATE
CREATE TABLE IF NOT EXISTS public.oauth_states (
  state text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' 
      AND tablename='oauth_states' 
      AND policyname='oauth_states_owner'
  ) THEN
    CREATE POLICY oauth_states_owner ON public.oauth_states
      FOR ALL 
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid());
  END IF;
END$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_states_owner_created
  ON public.oauth_states(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_external
  ON public.events(owner_id, external_source, external_id);

CREATE INDEX IF NOT EXISTS idx_events_owner_time_range
  ON public.events(owner_id, starts_at, ends_at);