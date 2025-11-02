-- إضافة حقول دينية وفواصل الأمان في profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS religion text
    CHECK (religion IN ('muslim','christian','jewish','hindu','buddhist','other','none'))
    DEFAULT 'muslim';

-- تحديث أسماء الأعمدة (إن كانت مختلفة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'prayer_pre_buffer_min'
  ) THEN
    ALTER TABLE public.profiles
      RENAME COLUMN prayer_prebuffer_min TO prayer_pre_buffer_min;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'prayer_post_buffer_min'
  ) THEN
    ALTER TABLE public.profiles
      RENAME COLUMN prayer_postbuffer_min TO prayer_post_buffer_min;
  END IF;
END$$;

-- إضافة حقول للمقترحات والقرارات في conflicts
ALTER TABLE public.conflicts
  ADD COLUMN IF NOT EXISTS suggestion jsonb,
  ADD COLUMN IF NOT EXISTS decided_action text,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS snooze_until timestamptz,
  ADD COLUMN IF NOT EXISTS prayer_time timestamptz;

-- تحديث القيود
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'conflicts_status_check'
  ) THEN
    ALTER TABLE public.conflicts
      DROP CONSTRAINT IF EXISTS conflicts_status_check;
    
    ALTER TABLE public.conflicts
      ADD CONSTRAINT conflicts_status_check
      CHECK (status IN ('open','proposed','resolved','snoozed','ignored'));
  END IF;
END$$;

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_conflicts_owner_status
  ON public.conflicts(owner_id, status);

-- فهرس فريد لمنع التكرار
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conflict_key
  ON public.conflicts(owner_id, event_id, prayer_name, date_iso)
  WHERE status != 'ignored';