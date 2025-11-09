# طبقة الذكاء الاصطناعي - دليل الإعداد

## نظرة عامة
طبقة ذكاء متكاملة تستخدم Lovable AI Gateway مع أدوات حتمية، تخزين مؤقت، مدقق للمخرجات، وحصص يومية.

---

## المكونات الأساسية

### 1) الأدوات الحتمية (Deterministic Tools)

#### budget-simulator
- **المسار**: `supabase/functions/budget-simulator/index.ts`
- **الوظيفة**: يحلل الميزانية الشهرية ويتحقق من التزام المستخدم بقواعد 50/30/20
- **المدخلات**: `user_id`, `scenario` (spend/subscribe)
- **المخرجات**: `is_within_budget`, `impact_on_savings`, `remaining_discretionary`, `alerts`

#### scheduler-solver
- **المسار**: `supabase/functions/scheduler-solver/index.ts`
- **الوظيفة**: يجد أوقات فارغة في التقويم مع مراعاة HRV-Z
- **المدخلات**: `user_id`, `task` (duration_minutes, name), `constraints`
- **المخرجات**: `suggested_slots[]` مع start_time, end_time, rationale

#### nutrition-estimator
- **المسار**: `supabase/functions/nutrition-estimator/index.ts`
- **الوظيفة**: يقدّر القيم الغذائية من وصف الطعام
- **المدخلات**: `food_description`, `quantity`
- **المخرجات**: `kcal`, `carbs_g`, `fat_g`, `protein_g`, `confidence`, `source_db`

### 2) الموجّه (Router)

**المسار**: `supabase/functions/ai-router/index.ts`

يصنّف النية إلى:
- `get_data`: أسئلة بسيطة (خطوات، نوم، إنفاق) → **لا يستدعي LLM**
- `complex_analysis`: تحليل معقد → يستدعي الأوركستريتور

**أنماط get_data**:
```regex
/عدد.*خطوات|steps/i
/نومي|sleep/i
/كم.*أنفقت|spent/i
/الرصيد|balance/i
/موعدي|اجتماعي|next event/i
```

### 3) المدقق (Critic)

**المسار**: `supabase/functions/_shared/critic.ts`

**الوظائف**:
1. **schemaValidate**: يتحقق من مطابقة الرد لـ MANDATORY_SCHEMA
2. **extractNumbers**: يستخرج الأرقام من النص للتحقق من الهلوسة الرقمية

**MANDATORY_SCHEMA**:
```json
{
  "advice": "string",
  "actions": ["string"],
  "rationale": "string",
  "sources": ["string"],
  "confidence": 0.0-1.0,
  "impacts": {
    "finance": number,
    "health": number,
    "time": number
  }
}
```

### 4) الأوركستريتور (Orchestrator)

**المسار**: `supabase/functions/ai-orchestrator/index.ts`

**سير العمل**:
```
1. التحقق من الحصة اليومية
2. فحص الكاش (cache_key = hash(user_id + prompt + domain + date))
3. استرجاع السياسات (ai_policies) حسب domain
4. استدعاء الأدوات (budget-simulator, scheduler-solver...)
5. بناء master prompt (system + policies + tools + user_prompt)
6. استدعاء Lovable AI (google/gemini-2.5-flash)
7. التحقق من المخطط والأرقام (Critic)
8. حفظ في recommendations
9. تخزين في ai_cache (TTL = 1 ساعة)
10. تسجيل في ai_calls_log + تحديث ai_quota
```

**النموذج المستخدم**: `google/gemini-2.5-flash` (سريع ورخيص)

**التكلفة**: ~$0.00015 لكل 1000 توكن

---

## الجداول

### ai_cache
```sql
cache_key TEXT PRIMARY KEY
user_id UUID
payload JSONB
created_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
```
**الغرض**: تخزين مؤقت للتوصيات لتجنب استدعاءات LLM المتكررة

### ai_calls_log
```sql
id BIGSERIAL PRIMARY KEY
user_id UUID
route TEXT (router|orchestrator|tool_name)
model TEXT
tokens_in INT
tokens_out INT
cost_usd NUMERIC(10,4)
latency_ms INT
cached BOOLEAN
created_at TIMESTAMPTZ
```
**الغرض**: مراقبة الاستخدام والتكاليف

### ai_quota
```sql
user_id UUID PRIMARY KEY
daily_calls_limit INT (default: 50)
daily_calls_used INT
window_start DATE
```
**الغرض**: حصص يومية لمنع الإفراط في الاستخدام

### ai_policy_embeddings (اختياري)
```sql
policy_id BIGINT PRIMARY KEY
embedding VECTOR(1536)
updated_at TIMESTAMPTZ
```
**الغرض**: تمكين RAG للسياسات (مستقبلاً)

---

## الاستخدام من العميل

### مثال: React Hook

```typescript
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';

function MyComponent() {
  const { ask, loading, response, cached, error } = useAIOrchestrator({
    onSuccess: (data) => console.log('Success:', data),
    onError: (err) => toast.error(err.message)
  });

  const handleAsk = async () => {
    await ask(
      "هل أقدر أصرف 150 ريال على العشاء؟",
      "finance",
      "ar"
    );
  };

  return (
    <div>
      <button onClick={handleAsk} disabled={loading}>
        اسأل الذكاء الاصطناعي
      </button>
      
      {response && (
        <AIRecommendationCard
          advice={response.advice}
          actions={response.actions}
          rationale={response.rationale}
          sources={response.sources}
          confidence={response.confidence}
          impacts={response.impacts}
          cached={cached}
        />
      )}
    </div>
  );
}
```

---

## معايير القبول (QA)

### ✅ التوصية المكررة تُسترجع من الكاش
```bash
# المرة الأولى: استدعاء LLM
curl -X POST .../functions/v1/ai-orchestrator \
  -H "Authorization: Bearer ${JWT}" \
  -d '{"prompt":"كم خطواتي اليوم؟","domain":"health"}'
# Response: { "ok": true, "cached": false, "data": {...} }

# المرة الثانية (خلال ساعة):
# نفس الطلب → { "ok": true, "cached": true, "data": {...} }
```

### ✅ فشل التحقق من المخطط
```bash
# إذا أرجع LLM JSON غير صحيح:
# Response: { "ok": false, "error": "Schema invalid: missing advice" }
```

### ✅ الهلوسة الرقمية تُكتشف
```bash
# إذا اخترع LLM رقمًا غير موجود في toolData:
# Log warning: "Possible numeric hallucination: [1234]"
```

### ✅ تجاوز الحصة اليومية
```bash
# بعد 50 استدعاء في اليوم:
# Response: { "ok": false, "error": "Daily quota exceeded" }, status: 429
```

### ✅ تسجيل التكاليف
```sql
SELECT route, model, tokens_in, tokens_out, cost_usd, latency_ms, cached
FROM ai_calls_log
WHERE user_id = ${USER_ID}
ORDER BY created_at DESC
LIMIT 10;
```

---

## الأمان والامتثال

### 1) حماية الأسرار
- `LOVABLE_API_KEY`: موجود تلقائياً في بيئة Supabase
- **لا** تعرض المفتاح أبدًا للعميل
- جميع استدعاءات LLM عبر Edge Functions فقط

### 2) RLS على الجداول
```sql
-- ai_cache: المستخدم يقرأ/يكتب ذاته فقط
auth.uid() = user_id

-- ai_calls_log: المستخدم يقرأ ذاته فقط (لا إدراج من العميل)
auth.uid() = user_id (SELECT only)

-- ai_quota: المستخدم يقرأ/يكتب ذاته فقط
auth.uid() = user_id
```

### 3) تنبيه عدم المسؤولية
```html
<div class="disclaimer">
  <AlertCircle />
  هذه التوصية مبنية على البيانات المتاحة ولا تعتبر نصيحة مالية أو طبية رسمية.
  استشر متخصصًا عند الحاجة.
</div>
```

### 4) المصادر (Sources)
- كل توصية تتضمن `sources[]` من:
  - السياسات: `["CFPB-FIN-001"]`
  - الأدوات: `["budget-simulator", "scheduler-solver"]`
  - قاعدة البيانات: `["financial_events", "signals_daily"]`

---

## معالجة الأخطاء

### من Lovable AI Gateway

#### 429 - Rate Limit
```typescript
if (response.status === 429) {
  toast.error("تجاوزت الحد المسموح. حاول لاحقاً.");
}
```

#### 402 - Payment Required
```typescript
if (response.status === 402) {
  toast.error("يجب شحن الرصيد في Lovable AI.");
}
```

### من الكاش/الحصص

#### Daily Quota Exceeded
```typescript
if (error?.message.includes("quota")) {
  toast.error("استنفدت حصتك اليومية (50 استدعاء). حاول غداً.");
}
```

---

## التحسينات المستقبلية (v2)

### 1) RAG الكامل مع Embeddings
```sql
-- عند إضافة سياسة جديدة:
INSERT INTO ai_policy_embeddings (policy_id, embedding)
SELECT id, generate_embedding(content)
FROM ai_policies
WHERE id = ${NEW_POLICY_ID};

-- عند الاسترجاع:
SELECT p.* FROM ai_policies p
JOIN ai_policy_embeddings e ON e.policy_id = p.id
ORDER BY e.embedding <-> generate_embedding(${USER_QUERY})
LIMIT 3;
```

### 2) Fine-tuning النموذج الخاص
- جمع بيانات تدريب من `recommendations` + user_feedback
- Fine-tune `google/gemini-2.5-flash` على حالات الاستخدام الشائعة
- تقليل التكلفة والزمن

### 3) Multi-agent Orchestration
```
Router → [Budget Agent, Health Agent, Schedule Agent] → Coordinator → User
```

### 4) أدوات إضافية
- `prayer-scheduler`: يجد أوقات خالية بين الصلوات
- `habit-tracker`: يحلل الأنماط ويقترح عادات
- `goal-progress-analyzer`: يقيّم التقدم نحو الأهداف

---

## الخلاصة

✅ **الأمر 5 مكتمل**:
1. أدوات حتمية: budget-simulator, scheduler-solver, nutrition-estimator
2. موجّه رخيص (ai-router)
3. مدقق (critic) مع schema validation + numeric checks
4. أوركستريتور (ai-orchestrator) مع Lovable AI Gateway
5. كاش (ai_cache) + حصص (ai_quota) + تسجيل (ai_calls_log)
6. React Hooks + UI Components

**الأوامر المكتملة**: 1 ✅ | 2 ✅ | 3 ✅ | 4 ✅ | 5 ✅

**جاهز للأمر 6**: قناة البيانات الغذائية/الصحية UX + Onboarding + عرض البطاقات
