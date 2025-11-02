-- إضافة حقل allow_location إلى جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS allow_location BOOLEAN DEFAULT false;

-- إضافة تعليق توضيحي
COMMENT ON COLUMN public.profiles.allow_location IS 'السماح بتتبع الموقع الجغرافي';