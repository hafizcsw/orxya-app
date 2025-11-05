-- إصلاح مشكلة Exposed Auth Users
-- إزالة أي Views تكشف auth.users (إذا وجدت)

-- إضافة جدول audit_log لتتبع استخدام Google Tokens
CREATE TABLE IF NOT EXISTS public.sync_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'token_refresh', 'sync_start', 'sync_success', 'sync_error', 'conflict'
  provider TEXT NOT NULL DEFAULT 'google',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_audit ENABLE ROW LEVEL SECURITY;

-- Policy: المستخدمون يمكنهم قراءة سجلاتهم فقط
CREATE POLICY "Users can view their own sync audit"
  ON public.sync_audit
  FOR SELECT
  USING (auth.uid() = user_id);

-- Index لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_sync_audit_user_created 
  ON public.sync_audit(user_id, created_at DESC);

-- إضافة عمود last_write_origin في events (إذا لم يكن موجوداً)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'last_write_origin'
  ) THEN
    ALTER TABLE public.events 
    ADD COLUMN last_write_origin TEXT DEFAULT 'user';
  END IF;
END $$;

COMMENT ON TABLE public.sync_audit IS 'Audit log for external calendar synchronization and token usage';
COMMENT ON COLUMN public.events.last_write_origin IS 'Tracks whether last change came from user or external sync (user|google|apple|etc)';