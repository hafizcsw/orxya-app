-- Block 15: AI Assist infrastructure
-- جدول تتبع استخدام الذكاء الاصطناعي والكلفة (Credit Saver)
CREATE TABLE IF NOT EXISTS public.ai_runs (
  id BIGSERIAL PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('suggest_tasks', 'summarize_project', 'rewrite_title', 'split_subtasks')),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_runs_select_own" ON public.ai_runs
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "ai_runs_insert_own" ON public.ai_runs
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Index للاستعلامات السريعة عن الكلفة اليومية
CREATE INDEX IF NOT EXISTS idx_ai_runs_owner_date ON public.ai_runs(owner_id, created_at DESC);