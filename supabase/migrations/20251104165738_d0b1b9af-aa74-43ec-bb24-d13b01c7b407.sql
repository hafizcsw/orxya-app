-- جدول أعلام المستخدمين
CREATE TABLE IF NOT EXISTS public.user_feature_flags (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_feature_flags_rw ON public.user_feature_flags;
CREATE POLICY user_feature_flags_rw ON public.user_feature_flags
  FOR ALL 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- تفعيل ff_glances للمستخدم الحالي
INSERT INTO public.user_feature_flags (user_id, flags)
SELECT id, '{"ff_glances": true}'::jsonb
FROM auth.users
WHERE email = 'admin@admin.com'
ON CONFLICT (user_id) 
DO UPDATE SET flags = jsonb_set(
  user_feature_flags.flags,
  '{ff_glances}',
  'true'::jsonb,
  true
);