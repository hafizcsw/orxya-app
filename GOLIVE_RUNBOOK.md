# Oryxa — Go-Live Runbook (Close-Out)

> نسخة مختصرة قابلة للتنفيذ خطوة-بخطوة. اتبع الترتيب كما هو.

---

## 0️⃣ تجميد مؤقت

- [ ] إيقاف نشرات الويب/الموبايل مؤقتًا
- [ ] تعطيل أي وظائف `cron` غير ضرورية أثناء الترحيل

---

## 1️⃣ أسرار البيئة (Staging ثم Production)

> **املأ القيم حسب بيئتك** ثم اضبطها في Supabase Functions.

**.env.staging / .env.prod**

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REDIRECT_URI=https://your-project.supabase.co/functions/v1/calendar-oauth-callback

TOKEN_ENC_KEY=0123456789abcdef0123456789abcdef  # 32 bytes hex
LOVABLE_API_KEY=lovable_xxxxx
OPENAI_API_KEY=sk-proj-xxxxx  # اختياري
ELEVENLABS_API_KEY=xxxxx      # اختياري

WEBHOOK_BASE=https://your-project.supabase.co/functions/v1
```

**تعيين الأسرار:**

```bash
# Staging
supabase secrets set --env-file .env.staging --project-ref your-staging-ref

# Production (لاحقًا)
supabase secrets set --env-file .env.prod --project-ref your-production-ref
```

---

## 2️⃣ ترحيلات قاعدة البيانات

✅ **تم تنفيذ Migration النهائي** الذي يحتوي على:

- `calendar_events_mirror` + فهارس + سياسات RLS
- `calendar_watch_channels` لتتبع قنوات Watch
- توحيد حقل `hrv_z` في `signals_daily`
- إنشاء جداول `ai_quota`, `ai_cache`, `feature_flags`
- **إلغاء** دالة `exec_sql` الخطرة
- دوال `get_feature_flag()` و `stop_calendar_watch()`

**التحقق من نجاح Migration:**

```sql
-- تحقق من الجداول الجديدة
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'calendar_events_mirror',
  'calendar_watch_channels',
  'ai_quota',
  'ai_cache',
  'feature_flags'
);

-- تحقق من RLS
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true AND t.schemaname = 'public'
);
-- يجب أن يعيد 0 صفوف

-- تحقق من إلغاء exec_sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'exec_sql';
-- يجب أن يعيد 0 صفوف
```

---

## 3️⃣ نشر الوظائف (Functions)

نشر بالترتيب التالي:

```bash
# 1. Core Functions
supabase functions deploy health
supabase functions deploy ops-alert

# 2. Calendar Functions
supabase functions deploy calendar-oauth-start
supabase functions deploy calendar-oauth-callback
supabase functions deploy calendar-watch-setup
supabase functions deploy calendar-sync
supabase functions deploy calendar-sync-google
supabase functions deploy calendar-notify
supabase functions deploy calendar-renew
supabase functions deploy calendar-apply

# 3. AI Functions
supabase functions deploy ai-router
supabase functions deploy ai-orchestrator
supabase functions deploy ai-orchestrator-v2
supabase functions deploy today-ai-insights
supabase functions deploy ai-chat-insights

# 4. Planning & Scheduling
supabase functions deploy scheduler-solver
supabase functions deploy budget-simulator
supabase functions deploy planner-agent
supabase functions deploy plan-now
supabase functions deploy plans-manage

# 5. Health & Nutrition
supabase functions deploy ingest-signals-raw
supabase functions deploy ingest-health
supabase functions deploy etl-health-daily
supabase functions deploy nutrition-estimator

# 6. Financial
supabase functions deploy ingest-financial-events
supabase functions deploy categorize-expense

# 7. Data & Reports
supabase functions deploy today-realtime-data
supabase functions deploy report-daily
supabase functions deploy summarize-period

# 8. Account Management
supabase functions deploy account-delete
supabase functions deploy account-export
supabase functions deploy privacy-export

# 9. Notifications
supabase functions deploy notify-dispatch
supabase functions deploy smart-notifications
supabase functions deploy conflict-autopilot-v2
```

**التحقق من النشر:**

```bash
# Health Check
curl https://your-project.supabase.co/functions/v1/health
# المتوقع: {"ok":true,"db":"ok",...}
```

---

## 4️⃣ إعداد Cron Jobs

```sql
-- Cron لتجديد قنوات Google Calendar يوميًا
SELECT cron.schedule(
  'calendar-renew-daily',
  '0 2 * * *',  -- كل يوم الساعة 2 صباحًا UTC
  $$
  SELECT net.http_post(
    url := current_setting('app.functions_base') || '/functions/v1/calendar-renew',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Cron للمراقبة والتنبيهات كل 10 دقائق
SELECT cron.schedule(
  'ops-alert-check',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.functions_base') || '/functions/v1/ops-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- تعيين GUCs
ALTER DATABASE postgres SET app.functions_base = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.service_key = 'your-service-role-key';
```

---

## 5️⃣ Feature Flags (الإطلاق التدريجي)

```sql
-- الحالة الأولية (Soft Launch - 10%)
UPDATE public.feature_flags SET enabled = true 
WHERE key IN ('AI_COMPLEX_ON', 'CALENDAR_WATCH_ENABLED', 'HEALTH_SYNC_ENABLED');

UPDATE public.feature_flags SET enabled = false 
WHERE key = 'LAUNCH_PERCENT_100';

-- التحقق من الحالة
SELECT * FROM public.feature_flags ORDER BY key;
```

---

## 6️⃣ فحوص الاعتماد (Smoke Tests)

### A. الصحة (Health)

```sql
-- تحقق من وصول بيانات HRV
SELECT COUNT(*) as hrv_count
FROM signals_daily 
WHERE metric = 'hrv_rmssd'
AND day >= CURRENT_DATE - INTERVAL '14 days';

-- تحقق من baseline_days_collected
-- عبر استدعاء today-realtime-data وفحص health.baseline_days_collected
```

### B. المالية (Finance)

```sql
-- تحقق من الأحداث المالية
SELECT * FROM financial_events 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY when_at DESC LIMIT 10;
```

### C. التقويم (Calendar)

```sql
-- تحقق من المرآة
SELECT COUNT(*) FROM calendar_events_mirror;

-- تحقق من القنوات النشطة
SELECT * FROM calendar_watch_channels 
WHERE stopped_at IS NULL;
```

### D. الذكاء الاصطناعي (AI)

```bash
# اختبار Router (يجب أن يصنف بدون LLM)
curl -X POST https://your-project.supabase.co/functions/v1/ai-router \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query":"كم أنفقت اليوم؟"}'
# المتوقع: route="get_data"

# اختبار Orchestrator (يجب أن يعيد JSON Schema)
curl -X POST https://your-project.supabase.co/functions/v1/ai-orchestrator \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"query":"اقترح لي خطة للأسبوع القادم","route":"llm_chat"}'
```

```sql
-- تحقق من AI logs
SELECT route, model, cached, cost_usd, duration_ms
FROM ai_calls_log 
ORDER BY created_at DESC LIMIT 10;

-- تحقق من Cache
SELECT COUNT(*) as cached_count 
FROM ai_cache 
WHERE expires_at > NOW();
```

### E. الأمان (Security)

```sql
-- RLS Check (يجب أن يعيد 0 صفوف)
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true AND t.schemaname = 'public'
);
```

---

## 7️⃣ المراقبة (Monitoring)

```bash
# Health Check المستمر
curl https://your-project.supabase.co/functions/v1/health

# Ops Alert (يتحقق من العتبات)
curl -X POST https://your-project.supabase.co/functions/v1/ops-alert \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

**Metrics المطلوب متابعتها:**

- ✅ Edge Functions p95 latency < 600ms
- ✅ Error rate < 1.5%
- ✅ AI cost per user/day < $0.03
- ✅ Cache hit rate > 60%

---

## 8️⃣ الإطلاق التدريجي

### اليوم 1: Soft Launch (10%)

```sql
-- الحالة الحالية
SELECT * FROM feature_flags WHERE key = 'LAUNCH_PERCENT_100';
-- enabled = false (10% فقط)
```

**المراقبة لمدة 24-48 ساعة:**
- [ ] لا أخطاء حرجة
- [ ] Latency مقبول
- [ ] Cost ضمن المتوقع

### اليوم 2-3: Medium Launch (50%)

```sql
-- توسيع الإطلاق (يمكن التحكم عبر logic إضافي)
-- أو ببساطة زيادة النسبة تدريجيًا
```

### اليوم 4+: Full Launch (100%)

```sql
-- إطلاق كامل
UPDATE public.feature_flags SET enabled = true 
WHERE key = 'LAUNCH_PERCENT_100';
```

---

## 9️⃣ خطة الطوارئ (Emergency Runbook)

### A. قفزة تكلفة LLM

```sql
-- Kill switch فوري
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'AI_COMPLEX_ON';
```

```typescript
// في ai-orchestrator: زيادة TTL للكاش
const CACHE_TTL = 21600; // 6 ساعات بدلاً من 1
```

### B. Webhook تقويم معطّل

```sql
-- تعطيل Watch مؤقتًا
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'CALENDAR_WATCH_ENABLED';

-- تفعيل fallback sync (يدوي أو polling تفريقي)
```

### C. أخطاء Auth/Redirect

- [ ] تحقق من `GOOGLE_REDIRECT_URI` في Secrets
- [ ] تحقق من PKCE flow
- [ ] تحقق من `detectSessionInUrl` في Supabase client

### D. RLS 403 Errors

```sql
-- تحقق من policies الجديدة
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## 🔟 التوثيق النهائي

- [ ] تحديث `README.md` بالحالة النهائية
- [ ] توثيق Feature Flags وكيفية استخدامها
- [ ] توثيق Emergency Procedures
- [ ] إنشاء Monitoring Dashboard URLs
- [ ] مشاركة Runbook مع الفريق

---

## ✅ معايير النجاح (Go/No-Go)

### ✅ GO إذا:
- [x] كل ERRORs الأمنية مُصلحة (Migration تم)
- [x] جميع Functions منشورة ومُختبرة
- [ ] Staging مستقر لـ 48 ساعة
- [ ] Performance benchmarks met (p95 < 600ms)
- [ ] Cost within budget
- [ ] الفريق جاهز

### ❌ NO-GO إذا:
- أي ERROR أمني حرج
- Tests فاشلة
- Performance issues على Staging
- Missing critical secrets
- Team not ready

---

## 📞 جهات الاتصال الطارئة

- **Tech Lead**: [اسم + رقم]
- **DevOps**: [اسم + رقم]
- **On-Call Engineer**: [اسم + رقم]

---

## ملاحظات نهائية

1. **لا Polling من العميل**: كل المزامنات عبر Webhook/Cron/Watch وخادم يدفع للعميل (Realtime/Push)
2. **لا نصوص حساسة** تُخزن/تسجل (خصوصًا إشعارات/رسائل)
3. **راقب** Slack/Webhook للتنبيهات (أخطاء/تكلفة/زمن استجابة)
4. **Rollback Plan**: Kill switch جاهز دائمًا
5. **Backup**: PITR enabled في Supabase (نقاط استرجاع كل 2 ثانية)

---

**آخر تحديث:** 2025-11-09  
**الإصدار:** 2.0.0-golive  
**الحالة:** ✅ جاهز للتنفيذ
