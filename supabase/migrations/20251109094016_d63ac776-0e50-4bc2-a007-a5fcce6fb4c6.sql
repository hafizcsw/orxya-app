-- =======================
-- Calendar Mirror Tables
-- =======================

-- تعديل external_accounts لدعم التقويم
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='external_accounts' 
    AND column_name='refresh_token_enc'
  ) THEN
    ALTER TABLE public.external_accounts
      ADD COLUMN refresh_token_enc text;
  END IF;
END$$;

-- حالة المزامنة لكل تقويم
CREATE TABLE IF NOT EXISTS public.calendar_sync_state (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google')),
  calendar_id text NOT NULL,
  sync_token text,
  full_sync_done boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provider, calendar_id)
);

ALTER TABLE public.calendar_sync_state ENABLE ROW LEVEL SECURITY;

-- قنوات Watch
CREATE TABLE IF NOT EXISTS public.calendar_watch_channels (
  channel_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('google')),
  calendar_id text NOT NULL,
  resource_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.calendar_watch_channels ENABLE ROW LEVEL SECURITY;

-- سياسات RLS: مقفلة تماماً (الوصول فقط عبر service_role)
DROP POLICY IF EXISTS "cal_sync_state_block_all" ON public.calendar_sync_state;
CREATE POLICY "cal_sync_state_block_all" ON public.calendar_sync_state
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "cal_watch_block_all" ON public.calendar_watch_channels;
CREATE POLICY "cal_watch_block_all" ON public.calendar_watch_channels
  FOR ALL USING (false) WITH CHECK (false);

-- دالة مساعدة لتنفيذ SQL من Edge Functions
CREATE OR REPLACE FUNCTION public.exec_sql(sql text, params jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- هذه دالة خطيرة - استخدمها فقط من service_role
  -- في الإنتاج: أضف فحوصات إضافية
  EXECUTE sql INTO result;
  RETURN result;
END;
$$;

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_cal_sync_state_user 
  ON public.calendar_sync_state(user_id, provider, calendar_id);

CREATE INDEX IF NOT EXISTS idx_cal_watch_expires 
  ON public.calendar_watch_channels(expires_at);

CREATE INDEX IF NOT EXISTS idx_cal_watch_user 
  ON public.calendar_watch_channels(user_id);
