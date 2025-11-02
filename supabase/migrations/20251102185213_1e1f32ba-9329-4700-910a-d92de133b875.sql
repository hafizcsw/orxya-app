-- تحديث القيمة الافتراضية لـ allow_location إلى true
ALTER TABLE public.profiles 
ALTER COLUMN allow_location SET DEFAULT true;

-- تحديث جميع السجلات الموجودة لتفعيل تتبع الموقع
UPDATE public.profiles 
SET allow_location = true 
WHERE allow_location IS NULL OR allow_location = false;