-- جدول تعلم قرارات المستخدم من Autopilot
CREATE TABLE IF NOT EXISTS public.autopilot_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conflict_id UUID REFERENCES public.conflicts(id) ON DELETE CASCADE,
  suggested_action TEXT NOT NULL,
  user_decision TEXT NOT NULL, -- 'accepted', 'rejected', 'modified'
  conflict_type TEXT NOT NULL, -- 'prayer', 'event', 'task'
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening', 'night'
  day_of_week INT,
  context JSONB, -- معلومات إضافية عن السياق
  created_at TIMESTAMPTZ DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- Index للأداء
CREATE INDEX idx_autopilot_learning_owner ON public.autopilot_learning(owner_id);
CREATE INDEX idx_autopilot_learning_decision ON public.autopilot_learning(owner_id, user_decision);
CREATE INDEX idx_autopilot_learning_action ON public.autopilot_learning(owner_id, suggested_action);

-- RLS policies
ALTER TABLE public.autopilot_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own learning data"
  ON public.autopilot_learning
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- جدول لتتبع أنماط الإشعارات
CREATE TABLE IF NOT EXISTS public.notification_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  action_taken TEXT, -- 'opened', 'dismissed', 'snoozed', 'acted'
  time_of_day TEXT,
  day_of_week INT,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index للأداء
CREATE INDEX idx_notification_patterns_owner ON public.notification_patterns(owner_id);
CREATE INDEX idx_notification_patterns_action ON public.notification_patterns(owner_id, action_taken);

-- RLS policies
ALTER TABLE public.notification_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own notification patterns"
  ON public.notification_patterns
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- تحديث جدول conflicts لإضافة معلومات التعلم
ALTER TABLE public.conflicts 
ADD COLUMN IF NOT EXISTS learning_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS learned_confidence NUMERIC,
ADD COLUMN IF NOT EXISTS user_feedback TEXT; -- 'good', 'bad', 'neutral'

-- دالة لحساب confidence بناءً على التعلم
CREATE OR REPLACE FUNCTION calculate_learned_confidence(
  p_owner_id UUID,
  p_action TEXT,
  p_context JSONB
) RETURNS NUMERIC AS $$
DECLARE
  total_count INT;
  accepted_count INT;
  confidence_score NUMERIC;
BEGIN
  -- حساب عدد المرات التي قبل فيها المستخدم هذا النوع من الإجراءات
  SELECT 
    COUNT(*) FILTER (WHERE user_decision = 'accepted'),
    COUNT(*)
  INTO accepted_count, total_count
  FROM public.autopilot_learning
  WHERE owner_id = p_owner_id
    AND suggested_action = p_action
    AND created_at > NOW() - INTERVAL '30 days'; -- آخر 30 يوم فقط

  -- إذا لم يكن هناك بيانات كافية، return null
  IF total_count < 3 THEN
    RETURN NULL;
  END IF;

  -- حساب النسبة
  confidence_score := (accepted_count::NUMERIC / total_count::NUMERIC) * 100;
  
  RETURN confidence_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- دالة للحصول على أفضل وقت للإشعارات
CREATE OR REPLACE FUNCTION get_best_notification_time(
  p_owner_id UUID,
  p_notification_type TEXT
) RETURNS TIME AS $$
DECLARE
  best_hour INT;
BEGIN
  SELECT EXTRACT(HOUR FROM opened_at)::INT
  INTO best_hour
  FROM public.notification_patterns
  WHERE owner_id = p_owner_id
    AND notification_type = p_notification_type
    AND action_taken = 'opened'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY EXTRACT(HOUR FROM opened_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  IF best_hour IS NULL THEN
    -- default: 9 AM
    RETURN '09:00:00'::TIME;
  END IF;

  RETURN (best_hour || ':00:00')::TIME;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;