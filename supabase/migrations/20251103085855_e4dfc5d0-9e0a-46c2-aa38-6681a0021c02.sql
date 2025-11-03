-- إضافة حقل avatar_url إلى جدول profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- إنشاء bucket للصور الشخصية
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- سياسات الوصول للصور الشخصية
CREATE POLICY "الصور الشخصية يمكن رؤيتها من الجميع"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "المستخدم يمكنه رفع صورته الشخصية"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدم يمكنه تحديث صورته الشخصية"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدم يمكنه حذف صورته الشخصية"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);