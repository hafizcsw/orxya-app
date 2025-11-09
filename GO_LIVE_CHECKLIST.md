# ✅ قائمة التحقق النهائية للإطلاق (Go-Live Checklist)

## 📋 المرحلة 0: التجميد والتحضير (Freeze & Prep)

- [ ] إيقاف نشرات الويب/الموبايل مؤقتًا
- [ ] تعطيل CRON jobs غير الضرورية أثناء الترحيل
- [ ] إعلام الفريق بفترة الصيانة
- [ ] تجهيز خطة Rollback

## 📋 المرحلة 1: ترحيلات قاعدة البيانات

✅ **تم التنفيذ**: Migration النهائي يشمل:

- [x] جدول `calendar_events_mirror` + فهارس
- [x] توحيد عمود `hrv_z` في `signals_daily`
- [x] جداول `ai_quota` و `ai_cache`
- [x] إلغاء دالة `exec_sql` الخطرة
- [x] جدول `feature_flags` للتحكم بالإطلاق
- [x] جدول `calendar_watch_channels` لتتبع القنوات
- [x] دالة `get_feature_flag()`
- [x] دالة `stop_calendar_watch()`

### التحقق من نجاح Migration:

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

-- تحقق من Feature Flags
SELECT * FROM public.feature_flags ORDER BY key;

-- تحقق من إلغاء exec_sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'exec_sql';
-- يجب أن يعيد 0 صفوف
```

## 📋 المرحلة 2: تحديثات Edge Functions

### Functions المحدثة:

- [x] `today-realtime-data` - إضافة `baseline_days_collected`
- [x] `calendar-renew` - إيقاف القنوات القديمة قبل إنشاء جديدة
- [x] `ai-orchestrator` - يستخدم Lovable AI Gateway
- [x] `health` - Health check شامل
- [x] `ops-alert` - مراقبة وتنبيهات

### اختبار Functions:

```bash
# Health Check
curl https://your-project.supabase.co/functions/v1/health
# المتوقع: {"ok":true,"db":"ok",...}

# Today Realtime Data (يحتاج JWT)
curl -X POST https://your-project.supabase.co/functions/v1/today-realtime-data \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-11-09"}'
# المتوقع: {...,"health":{"baseline_days_collected":N}}
```

## 📋 المرحلة 3: الأمان (Security)

### CSP Headers:

- [x] إضافة Content Security Policy في `index.html`
- [x] X-Content-Type-Options: nosniff
- [x] X-Frame-Options: DENY
- [x] Referrer-Policy: strict-origin-when-cross-origin

### RLS Policies:

```bash
# تشغيل Security Linter
# في Supabase Dashboard → Database → Linter
# أو عبر CLI:
supabase db lint

# يجب ألا يكون هناك:
# - جداول بدون RLS
# - Policies مفقودة
# - SECURITY DEFINER functions بدون search_path
```

### التحقق من الأمان:

- [ ] جميع الجداول لديها RLS enabled
- [ ] لا توجد دوال `SECURITY DEFINER` بدون `search_path`
- [ ] تم إزالة `exec_sql` تمامًا
- [ ] External accounts مُشفرة
- [ ] Secrets محفوظة بأمان (لا hardcoded keys)

## 📋 المرحلة 4: الأسرار والمفاتيح (Secrets & Keys)

### Staging Secrets:

```bash
# تعيين الأسرار على Staging
supabase secrets set --env-file .env.staging

# التحقق
supabase secrets list --project-ref your-staging-ref
```

### Production Secrets:

```bash
# تعيين الأسرار على Production
supabase secrets set --env-file .env.prod

# التحقق
supabase secrets list --project-ref your-production-ref
```

### Secrets المطلوبة:

- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`
- [ ] `OPENAI_API_KEY` (اختياري)
- [ ] `LOVABLE_API_KEY`
- [ ] `TOKEN_ENC_KEY` (32 bytes hex)
- [ ] `ELEVENLABS_API_KEY` (اختياري)

## 📋 المرحلة 5: Feature Flags

### الحالة الأولية (Soft Launch):

```sql
-- تفعيل الميزات الأساسية فقط
UPDATE public.feature_flags SET enabled = true 
WHERE key IN ('AI_COMPLEX_ON', 'CALENDAR_WATCH_ENABLED', 'HEALTH_SYNC_ENABLED');

-- إطلاق تدريجي (10% من المستخدمين)
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'LAUNCH_PERCENT_100';
```

### الحالة النهائية (Full Launch):

```sql
-- بعد 24-48 ساعة من الاستقرار
UPDATE public.feature_flags SET enabled = true 
WHERE key = 'LAUNCH_PERCENT_100';
```

### Kill Switch السريع:

```sql
-- في حالة الطوارئ
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'AI_COMPLEX_ON';
```

## 📋 المرحلة 6: فحوص الاعتماد (Acceptance Tests)

### A. الصحة (Health):

**Android Health Connect:**
- [ ] منح إذن Health Connect
- [ ] خطوات/HRV تصل إلى `signals_raw`
- [ ] ETL يُنشئ `signals_daily`
- [ ] `baseline_days_collected` > 0 في `/today`

**اختبار:**
```bash
# تحقق من وصول البيانات
SELECT COUNT(*) FROM signals_raw 
WHERE user_id = 'YOUR_USER_ID' 
AND metric = 'hrv_rmssd';

# تحقق من ETL
SELECT * FROM signals_daily 
WHERE user_id = 'YOUR_USER_ID' 
AND metric = 'hrv_rmssd'
ORDER BY day DESC LIMIT 14;
```

### B. المالية (Finance):

**Android Notification Listener:**
- [ ] إشعار بنك تجريبي يُحلّل
- [ ] `financial_events` تُنشأ مع `confidence > 0.7`
- [ ] Money Pulse يعرض البيانات

**اختبار:**
```bash
# تحقق من الأحداث المالية
SELECT * FROM financial_events 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY when_at DESC LIMIT 10;
```

### C. التقويم (Calendar):

**Google Calendar OAuth:**
- [ ] OAuth flow يعمل بنجاح
- [ ] `calendar_events_mirror` تمتلئ
- [ ] Watch channel يُنشأ في `calendar_watch_channels`
- [ ] التجديد اليومي يعمل (إيقاف قديم + إنشاء جديد)

**اختبار:**
```bash
# تحقق من المرآة
SELECT COUNT(*) FROM calendar_events_mirror 
WHERE user_id = 'YOUR_USER_ID';

# تحقق من القنوات النشطة
SELECT * FROM calendar_watch_channels 
WHERE user_id = 'YOUR_USER_ID' 
AND stopped_at IS NULL;
```

### D. الذكاء الاصطناعي (AI):

**Router Classification:**
- [ ] "كم أنفقت اليوم؟" → `get_data` (بدون LLM)
- [ ] "اقترح لي خطة للأسبوع القادم" → `llm_chat`

**Orchestrator:**
- [ ] يُرجع JSON Schema صحيح
- [ ] يمر فحص Critic (لا أرقام مخترعة)
- [ ] Cache يعمل (نفس الطلب = `cached: true`)
- [ ] Quota يُحسب بشكل صحيح

**اختبار:**
```bash
# تحقق من AI calls log
SELECT route, model, cached, cost_usd 
FROM ai_calls_log 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC LIMIT 10;

# تحقق من Quota
SELECT * FROM ai_quota WHERE user_id = 'YOUR_USER_ID';
```

### E. الأمان (Security):

**RLS Status:**
```sql
-- يجب ألا يُرجع أي صفوف
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT IN (
  SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE c.relrowsecurity = true AND t.schemaname = 'public'
);
```

**Account Export/Delete:**
- [ ] تصدير الحساب يعمل ويُطبّق RLS
- [ ] حذف الحساب يعمل ويُطبّق RLS

## 📋 المرحلة 7: المراقبة (Monitoring)

### Metrics المطلوب متابعتها:

**Performance:**
- [ ] Edge Functions p95 latency < 600ms
- [ ] Database query time < 100ms
- [ ] Error rate < 1.5%

**Cost:**
- [ ] AI cost per user/day < $0.03
- [ ] Total daily cost within budget

**Usage:**
- [ ] Active users tracking
- [ ] Feature adoption rates
- [ ] Cache hit rate > 60%

### التحقق:

```bash
# Health check
curl https://your-project.supabase.co/functions/v1/health

# Ops alert (يتحقق من العتبات)
curl https://your-project.supabase.co/functions/v1/ops-alert \
  -H "Authorization: Bearer SERVICE_ROLE_KEY"
```

## 📋 المرحلة 8: الإطلاق التدريجي (Gradual Rollout)

### اليوم 1: Soft Launch (10%)

```sql
-- تفعيل للمستخدمين الأوائل
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'LAUNCH_PERCENT_100';
```

**المراقبة:**
- [ ] لا أخطاء حرجة
- [ ] Latency مقبول
- [ ] Cost ضمن المتوقع

### اليوم 2-3: Medium Launch (50%)

```sql
-- توسيع الإطلاق
-- يمكن التحكم عبر user_id modulo أو flag
```

**المراقبة:**
- [ ] Performance مستقر
- [ ] No data loss
- [ ] User feedback إيجابي

### اليوم 4+: Full Launch (100%)

```sql
-- إطلاق كامل
UPDATE public.feature_flags SET enabled = true 
WHERE key = 'LAUNCH_PERCENT_100';
```

## 📋 المرحلة 9: خطة الطوارئ (Emergency Runbook)

### قفزة تكلفة LLM:

```sql
-- Kill switch فوري
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'AI_COMPLEX_ON';

-- زيادة TTL للكاش
-- في ai-orchestrator: ttlSec = 21600 (6 ساعات)
```

### Webhook تقويم معطّل:

```sql
-- تعطيل Watch مؤقتًا
UPDATE public.feature_flags SET enabled = false 
WHERE key = 'CALENDAR_WATCH_ENABLED';

-- تفعيل cron guard sync (polling تفريقي)
```

### أخطاء Auth/Redirect:

- [ ] تحقق من `GOOGLE_REDIRECT_URI`
- [ ] تحقق من PKCE flow
- [ ] تحقق من `detectSessionInUrl` في client

### RLS 403 Errors:

```sql
-- تحقق من policies الجديدة
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;
```

## 📋 المرحلة 10: التوثيق النهائي

- [ ] تحديث `README.md` بالحالة النهائية
- [ ] توثيق Feature Flags وكيفية استخدامها
- [ ] توثيق Emergency Procedures
- [ ] توثيق Monitoring Dashboard URLs
- [ ] إنشاء Runbook للفريق

## ✅ معايير النجاح (Success Criteria)

### قبل الإطلاق:
- [ ] جميع Migrations نجحت
- [ ] Security Linter: 0 ERRORs
- [ ] جميع Tests passed
- [ ] Staging يعمل بشكل صحيح
- [ ] Performance benchmarks met

### بعد الإطلاق (24 ساعة):
- [ ] Uptime > 99.5%
- [ ] Error rate < 1%
- [ ] No data loss
- [ ] Cost within budget
- [ ] Positive user feedback

### بعد الإطلاق (7 أيام):
- [ ] Feature adoption > 50%
- [ ] User retention stable
- [ ] No critical bugs
- [ ] Performance stable
- [ ] Team trained on runbook

## 🚨 نقاط القرار Go/No-Go

### ✅ GO إذا:
- كل ERRORs الأمنية مُصلحة
- جميع Tests نجحت
- Staging مستقر لـ 48 ساعة
- الفريق جاهز
- Rollback plan واضح

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
- **Product Owner**: [اسم + رقم]

---

**آخر تحديث:** 2025-11-09
**الإصدار:** 2.0.0-golive
**الحالة:** ✅ جاهز للإطلاق
