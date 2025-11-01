-- إضافة أعمدة مطلوبة لـ external_accounts
ALTER TABLE public.external_accounts
  ADD COLUMN IF NOT EXISTS provider_user_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS sync_token TEXT,
  ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;

-- إضافة أعمدة مطلوبة لـ events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_calendar_id TEXT;

-- فهرس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_extacc_owner_provider ON public.external_accounts(owner_id, provider);
CREATE INDEX IF NOT EXISTS idx_events_external ON public.events(owner_id, external_source, external_calendar_id);

-- قيد فريد لمنع تكرار نفس الحدث
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uniq_owner_ext'
  ) THEN
    ALTER TABLE public.events
      ADD CONSTRAINT uniq_owner_ext UNIQUE NULLS NOT DISTINCT (owner_id, external_source, external_id);
  END IF;
END $$;