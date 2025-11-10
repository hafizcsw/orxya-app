# نظام Live Update - دليل الاستخدام

## نظرة عامة
تم تفعيل نظام Live Update باستخدام `@capgo/capacitor-updater` لتحديث واجهة التطبيق النيتف بدون الحاجة لإعادة نشر التطبيق على المتاجر.

## المتطلبات الأولية

### 1. تثبيت الإضافة (تم بالفعل ✅)
```bash
npm i @capgo/capacitor-updater
```

### 2. مزامنة المشروع النيتف
```bash
npx cap sync
```

## كيفية بناء ونشر تحديث

### الطريقة الأوتوماتيكية (موصى بها)

استخدم السكربت الجاهز:

```bash
# بناء تحديث بنسخة تلقائية (تاريخ + وقت)
chmod +x scripts/build-update-bundle.sh
./scripts/build-update-bundle.sh

# أو بناء بنسخة محددة
./scripts/build-update-bundle.sh "2025.11.10-2"
```

السكربت سيقوم بـ:
1. ✅ بناء الويب (`npm run build`)
2. ✅ إنشاء ملف ZIP من مجلد `dist/`
3. ✅ حساب الـChecksum
4. ✅ تحديث `manifest.json` تلقائيًا

### الطريقة اليدوية

```bash
# 1. بناء المشروع
npm run build

# 2. إنشاء ZIP
cd dist
zip -r ../public/updates/bundles/2025.11.10-1.zip .
cd ..

# 3. حساب الـChecksum
shasum -a 256 public/updates/bundles/2025.11.10-1.zip

# 4. تحديث manifest.json يدويًا
```

## نشر التحديث

### على Lovable Hosting (الأسهل)

```bash
# انشر من لوحة Lovable (زر Publish/Update)
# الملفات في public/ ستُنشر تلقائيًا
```

بعد النشر، `manifest.json` و الـbundles ستكون متاحة على:
- `https://your-app.lovable.app/updates/manifest.json`
- `https://your-app.lovable.app/updates/bundles/VERSION.zip`

### على خادم خاص

ارفع الملفات التالية:
```
/updates/manifest.json
/updates/bundles/2025.11.10-1.zip
```

ثم حدّث `VITE_UPDATE_SERVER_URL` في `.env`:
```env
VITE_UPDATE_SERVER_URL=https://your-cdn.com/updates/manifest.json
```

## اختبار التحديث

### على الجهاز/المحاكي

1. **افتح التطبيق**
2. **اذهب للإعدادات → التحديثات**
3. **اضغط "فحص التحديثات"**
4. إذا كان هناك تحديث، ستظهر رسالة مع زر "تحديث الآن"
5. اضغط التحديث وانتظر التنزيل
6. التطبيق سيُعيد التحميل تلقائيًا

### التحقق من Logs

```bash
# Android
npx cap run android
# ثم راقب Logcat في Android Studio

# iOS  
npx cap run ios
# ثم راقب Console في Xcode
```

ابحث عن:
```
[LiveUpdate] Checking for updates...
[LiveUpdate] Current bundle: {...}
[LiveUpdate] Latest manifest: {...}
[LiveUpdate] Downloading update: 2025.11.10-1
[LiveUpdate] Download completed
[LiveUpdate] Bundle set as next version
```

## التكوين المتقدم

### تخصيص فترة الفحص

في `src/lib/live-update.ts`:

```typescript
export const LIVE_UPDATE_CONFIG = {
  checkOnStartup: true,        // فحص عند فتح التطبيق
  checkInterval: 30 * 60 * 1000, // فحص كل 30 دقيقة (بدلاً من ساعة)
}
```

### تفعيل التحديثات الإجبارية

في `manifest.json`:
```json
{
  "version": "2025.11.10-1",
  "mandatory": true,  // ← المستخدم لا يستطيع تخطي التحديث
  ...
}
```

### Rollback (التراجع لنسخة سابقة)

```typescript
import { CapacitorUpdater } from '@capgo/capacitor-updater';

// الرجوع للنسخة المدمجة في التطبيق
await CapacitorUpdater.reset();
```

## الأمان

### 1. Checksum Verification
السكربت يحسب SHA-256 تلقائيًا. لا تنشر بدون checksum!

### 2. HTTPS Only
تأكد أن `manifestUrl` يستخدم HTTPS فقط.

### 3. Signed Bundles (اختياري)
يمكنك توقيع الـZIP قبل رفعه:
```bash
# مثال باستخدام GPG
gpg --sign public/updates/bundles/VERSION.zip
```

## استكشاف الأخطاء

### "Failed to fetch manifest"
- تحقق من `manifestUrl` في `src/lib/live-update.ts`
- تأكد أن الملف منشور ومتاح عبر الإنترنت
- افتح الرابط في المتصفح للتأكد

### "Download failed"
- تحقق من صحة `url` في `manifest.json`
- تأكد أن ملف ZIP موجود
- تحقق من الـChecksum

### "Update not applying"
- راجع الـLogs في Android Studio/Xcode
- جرّب حذف التطبيق وإعادة تثبيته
- تأكد أن `npx cap sync` تم تنفيذه

### التطبيق لا يتحقق من التحديث
- تأكد أنك على **جهاز حقيقي** أو **محاكي** (ليس المتصفح)
- تحقق من `isNativePlatform()` في Console

## الفرق بين PWA و Live Update

| الميزة | PWA | Live Update (Capacitor) |
|--------|-----|------------------------|
| النظام | ويب فقط | Android + iOS |
| التحديث | تلقائي بالكامل | يحتاج manifest.json |
| السرعة | فوري | يحتاج تنزيل |
| متى يُستخدم | تطبيق ويب | تطبيق نيتف |

## الخطوات التالية

1. ✅ **اختبر على جهاز حقيقي** - جرّب التحديث على Android/iOS
2. ✅ **أتمتة النشر** - ربط السكربت مع CI/CD
3. ✅ **إضافة Analytics** - تتبع نسب نجاح التحديثات
4. ✅ **Rollback آلي** - إذا فشل التحديث، رجوع تلقائي

## روابط مفيدة

- [Capgo Documentation](https://capgo.app/docs/)
- [Capacitor Updater API](https://github.com/Cap-go/capacitor-updater)
- [Best Practices](https://capgo.app/docs/tooling/best-practices/)

---

**ملاحظة مهمة**: تحديثات Live Update تعمل **فقط للواجهة (HTML/CSS/JS)**. أي تغيير في:
- الأذونات (Permissions)
- الإضافات النيتف
- ملفات `AndroidManifest.xml` أو `Info.plist`

يتطلب **إعادة نشر على المتاجر**.
