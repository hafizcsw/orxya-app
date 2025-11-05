// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" }
  });
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

async function callLovableAI(messages: any[], tools?: any, toolChoice?: any): Promise<any> {
  const body: any = {
    model: 'google/gemini-2.5-flash',
    messages
  };

  if (tools) {
    body.tools = tools;
    if (toolChoice) body.tool_choice = toolChoice;
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${error}`);
  }

  return await response.json();
}

async function fetchDayContext(supabase: any, userId: string, date: string) {
  const [events, prayers, conflicts, tasks] = await Promise.all([
    supabase.from('events').select('*')
      .eq('owner_id', userId)
      .gte('starts_at', `${date}T00:00:00Z`)
      .lte('starts_at', `${date}T23:59:59Z`)
      .order('starts_at'),
    
    supabase.from('prayer_times').select('*')
      .eq('owner_id', userId)
      .eq('date_iso', date)
      .maybeSingle(),
    
    supabase.from('conflicts').select('*')
      .eq('owner_id', userId)
      .eq('date_iso', date)
      .eq('status', 'open'),

    supabase.from('events').select('*')
      .eq('owner_id', userId)
      .eq('source', 'local')
      .is('completed_at', null)
      .limit(20)
  ]);

  return {
    events: events.data || [],
    prayers: prayers.data,
    conflicts: conflicts.data || [],
    pending_tasks: tasks.data || []
  };
}

async function handlePlanMyDay(supabase: any, userId: string, date: string): Promise<any> {
  const context = await fetchDayContext(supabase, userId, date);
  
  const systemPrompt = `أنت مخطط يومي ذكي متخصص في التخطيط الإسلامي. مهمتك مساعدة المستخدم في تنظيم يومه بطريقة فعالة مع احترام أوقات الصلاة.

المبادئ:
1. **أوقات الصلاة لها الأولوية القصوى** - لا تقترح أي شيء يتعارض معها
2. **استخدم الأوقات بين الصلوات بذكاء** - كل فترة بين صلاتين هي "window" للإنتاجية
3. **راعي مستوى الطاقة**:
   - بعد الفجر: طاقة عالية - مهام صعبة ومهمة
   - بعد الظهر: طاقة متوسطة - اجتماعات ومهام متوسطة
   - بعد العصر: طاقة منخفضة - مهام روتينية
   - بعد المغرب: وقت عائلي وراحة
4. **اقترح breaks واستراحات** - كل ساعتين على الأقل
5. **احترم السفر والتنقلات** - احسب وقت الوصول

السياق الحالي:
- التاريخ: ${date}
- الأحداث المجدولة: ${context.events.length}
- المهام المعلقة: ${context.pending_tasks.length}
- التعارضات: ${context.conflicts.length}
- أوقات الصلاة: ${context.prayers ? 'متوفرة' : 'غير متوفرة'}`;

  const userPrompt = `خطط يومي (${date}) بذكاء:

أوقات الصلاة:
${context.prayers ? `
- الفجر: ${context.prayers.fajr}
- الظهر: ${context.prayers.dhuhr}
- العصر: ${context.prayers.asr}
- المغرب: ${context.prayers.maghrib}
- العشاء: ${context.prayers.isha}
` : 'غير متوفرة'}

الأحداث المجدولة (${context.events.length}):
${context.events.map((e: any) => `- ${e.title} (${new Date(e.starts_at).toLocaleTimeString('ar-SA', {hour: '2-digit', minute: '2-digit'})} - ${e.duration_min || 30} دقيقة)`).join('\n')}

المهام المعلقة (${context.pending_tasks.slice(0, 10).length}):
${context.pending_tasks.slice(0, 10).map((t: any, i: number) => `${i + 1}. ${t.title}`).join('\n')}

التعارضات (${context.conflicts.length}):
${context.conflicts.map((c: any) => `- ${c.prayer_name}: ${c.overlap_min} دقيقة تعارض`).join('\n')}

اقترح:
1. كيف أوزع المهام على windows بين الصلوات
2. أي المهام يجب أن تكون في الصباح (طاقة عالية)
3. متى يجب أن أخذ استراحات
4. كيف أحل التعارضات
5. نصائح لتحسين الإنتاجية`;

  const tools = [{
    type: "function",
    function: {
      name: "create_daily_plan",
      description: "إنشاء خطة يومية مفصلة",
      parameters: {
        type: "object",
        properties: {
          plan: {
            type: "object",
            properties: {
              morning_block: {
                type: "object",
                properties: {
                  time_range: { type: "string" },
                  suggested_tasks: { type: "array", items: { type: "string" } },
                  focus_type: { type: "string" }
                }
              },
              afternoon_block: {
                type: "object",
                properties: {
                  time_range: { type: "string" },
                  suggested_tasks: { type: "array", items: { type: "string" } },
                  focus_type: { type: "string" }
                }
              },
              evening_block: {
                type: "object",
                properties: {
                  time_range: { type: "string" },
                  suggested_tasks: { type: "array", items: { type: "string" } },
                  focus_type: { type: "string" }
                }
              },
              breaks: { type: "array", items: { type: "string" } },
              conflicts_resolution: { type: "array", items: { type: "string" } },
              productivity_tips: { type: "array", items: { type: "string" } },
              priority_tasks: { type: "array", items: { type: "string" } }
            },
            required: ["morning_block", "afternoon_block", "evening_block", "productivity_tips"]
          }
        },
        required: ["plan"]
      }
    }
  }];

  const response = await callLovableAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ], tools, { type: "function", function: { name: "create_daily_plan" } });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  if (toolCall) {
    const plan = JSON.parse(toolCall.function.arguments);
    return plan;
  }

  return { error: 'لم يتمكن من إنشاء خطة' };
}

async function handleOptimizeWeek(supabase: any, userId: string): Promise<any> {
  // الحصول على أحداث الأسبوع القادم
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('owner_id', userId)
    .gte('starts_at', today.toISOString())
    .lte('starts_at', nextWeek.toISOString())
    .order('starts_at');

  const systemPrompt = `أنت مخطط أسبوعي ذكي. مهمتك تحليل الأسبوع القادم واقتراح تحسينات.

ركز على:
1. توزيع الأحمال - تجنب أيام الذروة المتتالية
2. أيام الراحة - اقترح يوم أو أكثر للراحة
3. Deep Work Windows - أوقات للتركيز العميق
4. Balance - توازن بين العمل والحياة`;

  const userPrompt = `لدي ${events?.length || 0} موعد في الأسبوع القادم. حلل واقترح تحسينات:

${events?.map((e: any) => `- ${new Date(e.starts_at).toLocaleDateString('ar-SA')}: ${e.title}`).join('\n')}`;

  const response = await callLovableAI([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return response.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json();
    const { intent, date } = body;

    let result: any;

    switch (intent) {
      case 'plan_my_day':
        result = await handlePlanMyDay(supabase, user.id, date || new Date().toISOString().split('T')[0]);
        break;
      
      case 'optimize_week':
        result = await handleOptimizeWeek(supabase, user.id);
        break;

      default:
        return json({ ok: false, error: 'Unknown intent' }, 400);
    }

    return json({ ok: true, intent, result });
  } catch (e) {
    console.error('[ai-orchestrator-v2]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
