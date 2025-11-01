-- Patch 19: AI Orchestration Tables (Update existing)

-- Update ai_sessions to add consent columns if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema='public' AND table_name='ai_sessions' 
                AND column_name='consent_read_calendar') THEN
    ALTER TABLE public.ai_sessions 
      ADD COLUMN consent_read_calendar boolean default false,
      ADD COLUMN consent_write_calendar boolean default false,
      ADD COLUMN consent_write_tasks boolean default true;
  END IF;
END $$;

-- ai_actions: tool execution audit trail
CREATE TABLE IF NOT EXISTS public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_sessions(id) on delete cascade,
  tool text not null,
  input jsonb,
  output jsonb,
  created_at timestamptz not null default now()
);

ALTER TABLE public.ai_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_actions_rw ON public.ai_actions;

CREATE POLICY ai_actions_rw ON public.ai_actions
  FOR ALL 
  USING (
    session_id IN (
      SELECT id FROM public.ai_sessions WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.ai_sessions WHERE owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_actions_session ON public.ai_actions(session_id, created_at);