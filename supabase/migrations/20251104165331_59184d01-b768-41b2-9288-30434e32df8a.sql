-- جدول تفضيلات Glances
CREATE TABLE IF NOT EXISTS public.user_glances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  layout JSONB NOT NULL DEFAULT '{
    "slots": [
      {"id": "top-hero", "kind": "next_task", "visible": true},
      {"id": "row-1-a", "kind": "prayer_next", "visible": true},
      {"id": "row-1-b", "kind": "steps_today", "visible": true},
      {"id": "row-2-a", "kind": "work_progress", "visible": true},
      {"id": "row-2-b", "kind": "conflicts_badge", "visible": true},
      {"id": "row-3-a", "kind": "focus_toggle", "visible": true}
    ],
    "theme": "glass"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_glances ENABLE ROW LEVEL SECURITY;

-- RLS Policy: كل مستخدم يدير صفّه فقط
CREATE POLICY user_glances_rw ON public.user_glances
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- جدول حالة التركيز
CREATE TABLE IF NOT EXISTS public.user_focus_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_focus_state ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY user_focus_state_rw ON public.user_focus_state
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_user_glances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_glances_timestamp
  BEFORE UPDATE ON public.user_glances
  FOR EACH ROW
  EXECUTE FUNCTION update_user_glances_updated_at();