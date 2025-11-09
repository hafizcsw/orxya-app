# إعداد GitHub Actions للنشر التلقائي

## المتطلبات الأولية

### 1. إنشاء Supabase Access Token

1. اذهب إلى: https://supabase.com/dashboard/account/tokens
2. أنشئ Access Token جديد بالصلاحيات التالية:
   - Read access to projects
   - Write access to Edge Functions
   - Write access to Database
3. احفظ الـ Token بشكل آمن

### 2. تعيين GitHub Secrets

اذهب إلى: `Settings → Secrets and variables → Actions → New repository secret`

#### Secrets مطلوبة للـ Staging:

```
SUPABASE_ACCESS_TOKEN=supa_at_xxxxx...
STAGING_PROJECT_ID=your-staging-project-ref
STAGING_SUPABASE_URL=https://your-staging-ref.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
STAGING_GOOGLE_REDIRECT_URI=https://your-staging-ref.supabase.co/functions/v1/calendar-oauth-callback
```

#### Secrets مطلوبة للـ Production:

```
PRODUCTION_PROJECT_ID=your-production-project-ref
PROD_SUPABASE_URL=https://your-production-ref.supabase.co
PROD_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PROD_GOOGLE_REDIRECT_URI=https://your-production-ref.supabase.co/functions/v1/calendar-oauth-callback
```

#### Secrets مشتركة (Staging + Production):

```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
OPENAI_API_KEY=sk-proj-xxxxx
LOVABLE_API_KEY=lovable_xxxxx
TOKEN_ENC_KEY=32-byte-random-hex-string
ELEVENLABS_API_KEY=xxxxx (اختياري)
```

### 3. إنشاء Production Environment (للموافقة اليدوية)

1. اذهب إلى: `Settings → Environments → New environment`
2. اسم البيئة: `production`
3. فعّل: `Required reviewers`
4. أضف المراجعين المطلوبين (أنت أو فريقك)
5. احفظ

## استخدام Workflows

### Staging Deployment (تلقائي)

```bash
# النشر التلقائي يحدث عند push إلى:
git push origin staging
# أو
git push origin develop
```

### Production Deployment (يحتاج موافقة)

```bash
# النشر إلى Production يحدث عند push إلى:
git push origin main
# ثم:
# 1. اذهب إلى GitHub Actions
# 2. انتظر طلب الموافقة
# 3. راجع التغييرات
# 4. اضغط "Approve and deploy"
```

### نشر يدوي (Manual Trigger)

1. اذهب إلى: `Actions → Deploy to Staging/Production`
2. اضغط: `Run workflow`
3. اختر الـ branch
4. اضغط: `Run workflow`

## التحقق من النشر

### بعد Staging:
```bash
curl https://your-staging-ref.supabase.co/functions/v1/health
```

### بعد Production:
```bash
curl https://your-production-ref.supabase.co/functions/v1/health
```

**الاستجابة المتوقعة:**
```json
{
  "ok": true,
  "db": "ok",
  "cron": {
    "calendar_renew_daily": "ok",
    "ops_alert_check": "ok"
  },
  "version": "1.0.0"
}
```

## استكشاف الأخطاء

### خطأ في Authentication:
```bash
# تأكد من صحة SUPABASE_ACCESS_TOKEN
# أعد إنشاء token من Supabase Dashboard
```

### فشل Function Deployment:
```bash
# تحقق من:
# 1. صحة config.toml
# 2. عدم وجود syntax errors في الدوال
# 3. جميع dependencies موجودة
```

### فشل Health Check:
```bash
# تحقق من:
# 1. الدالة منشورة بنجاح
# 2. الـ secrets معينة بشكل صحيح
# 3. لا توجد أخطاء في Edge Function Logs
```

## الخطوات التالية

1. ✅ أضف GitHub Secrets المطلوبة
2. ✅ أنشئ Production Environment
3. ✅ اختبر النشر على Staging
4. ✅ راجع الـ logs في GitHub Actions
5. ✅ اختبر Health Endpoint
6. ✅ نشر على Production بعد التأكد

## ملاحظات الأمان

- ⚠️ **لا تشارك** الـ Secrets أبداً
- ⚠️ **دوّر** الـ tokens كل 90 يوماً
- ⚠️ **راجع** الـ Access Logs بانتظام
- ⚠️ **استخدم** Production Environment للموافقة اليدوية

## دعم إضافي

إذا واجهت مشاكل:
1. تحقق من [GitHub Actions Logs](../../actions)
2. راجع [Supabase Edge Function Logs](https://supabase.com/dashboard)
3. تحقق من [Security Audit](../../security)
