-- تعديل جدول prayer_times للدعم الكامل مع RLS
-- حذف السياسة القديمة العامة أولاً
DROP POLICY IF EXISTS "Anyone can read prayer times" ON public.prayer_times;

-- إضافة الأعمدة المطلوبة
ALTER TABLE public.prayer_times
  ADD COLUMN IF NOT EXISTS owner_id uuid NOT NULL DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS date_iso date NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- حذف عمود day القديم إن كان موجوداً
ALTER TABLE public.prayer_times DROP COLUMN IF EXISTS day;

-- فهرس فريد لكل مستخدم/يوم
CREATE UNIQUE INDEX IF NOT EXISTS uniq_prayer_times_owner_date
  ON public.prayer_times (owner_id, date_iso);

-- تفعيل RLS
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للقراءة والكتابة
CREATE POLICY prayers_select_own ON public.prayer_times
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY prayers_insert_own ON public.prayer_times
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY prayers_update_own ON public.prayer_times
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY prayers_delete_own ON public.prayer_times
  FOR DELETE USING (owner_id = auth.uid());

-- إضافة أعمدة الموقع وطريقة الحساب في profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric,
  ADD COLUMN IF NOT EXISTS prayer_method text DEFAULT 'MWL';