# 📅 Google Calendar Mirror - دليل الإعداد الكامل

## نظرة عامة

نظام مرآة التقويم يزامن أحداث Google Calendar تلقائيًا إلى قاعدة البيانات عبر:
- **OAuth 2.0**: تصريح آمن للوصول للقراءة فقط
- **Watch API**: إشعارات فورية عند التغييرات
- **Incremental Sync**: مزامنة ذكية باستخدام syncTokens
- **Auto-Renewal**: تجديد تلقائي للقنوات قبل انتهاء صلاحيتها

---

## 1️⃣ إعداد Google Cloud Console

### أ) إنشاء مشروع

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com)
2. أنشئ مشروع جديد أو استخدم موجود
3. فعّل **Google Calendar API**:
   - APIs & Services → Library
   - ابحث عن "Google Calendar API"
   - اضغط Enable

### ب) إعداد OAuth Consent Screen

1. اذهب إلى APIs & Services → OAuth consent screen
2. اختر User Type: **External**
3. املأ المعلومات:
   - App name: **Oryxa**
   - User support email: بريدك
   - Developer contact: بريدك
4. Scopes: أضف `.../auth/calendar.readonly`
5. Test users: أضف حساب Gmail للاختبار

### ج) إنشاء OAuth Client ID

1. اذهب إلى APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: **Web application**
4. Name: **Oryxa Calendar**
5. Authorized JavaScript origins:
   ```
   https://gcjggazmatipzqnxixhp.supabase.co
   https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com
   http://localhost:8080
   ```
6. Authorized redirect URIs:
   ```
   https://gcjggazmatipzqnxixhp.supabase.co/functions/v1/calendar-oauth-callback
   http://localhost:54321/functions/v1/calendar-oauth-callback
   ```
7. احفظ:
   - **Client ID**
   - **Client Secret**

---

## 2️⃣ إعداد Domain Verification للـ Webhooks

Google تطلب تحقق من النطاق لاستقبال Webhooks:

1. اذهب إلى [Google Search Console](https://search.google.com/search-console)
2. Add Property: `https://gcjggazmatipzqnxixhp.supabase.co`
3. طريقة التحقق الموصى بها: **HTML file upload**
4. بعد التحقق، أضف النطاق في Google Cloud Console:
   - APIs & Services → Domain verification
   - Add domain: `gcjggazmatipzqnxixhp.supabase.co`

---

## 3️⃣ إضافة Secrets إلى Lovable Cloud

استخدم Lovable Cloud لإضافة المتغيرات السرية:

<function_calls>
<invoke name="secrets--add_secret">
<parameter name="secret_names">["GOOGLE_REDIRECT_URI", "WEBHOOK_BASE", "WATCH_TTL_SECONDS", "APP_URL"]