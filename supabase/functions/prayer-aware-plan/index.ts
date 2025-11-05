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

async function callLovableAI(messages: any[]): Promise<any> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Lovable AI error: ${error}`);
  }

  return await response.json();
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
    const { date, tasks } = body;

    // جلب أوقات الصلاة والـ windows
    const { data: prayerWindows } = await supabase.rpc('get_prayer_windows', {
      p_owner_id: user.id,
      p_date: date
    });

    // جلب الأحداث المجدولة
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', user.id)
      .gte('starts_at', `${date}T00:00:00Z`)
      .lte('starts_at', `${date}T23:59:59Z`)
      .order('starts_at');

    const systemPrompt = `أنت مخطط ذكي يدور حول الصلاة. مهمتك جدولة المهام في أفضل الأوقات بين الصلوات.

المبادئ:
1. **احترم أوقات الصلاة** - لا تجدول أي شيء يتعارض مع الصلاة
2. **استخدم Prayer Windows بذكاء**:
   - بعد الفجر (high energy): مهام صعبة ومهمة (deep work)
   - بعد الظهر (medium energy): اجتماعات وعمل تعاوني
   - بعد العصر (low energy): مهام روتينية وإدارية
   - بعد المغرب (low energy): وقت عائلي وراحة
3. **راعِ الأحداث الموجودة** - لا تنشئ تعارضات
4. **اقترح أوقات واقعية** - مع فترات استراحة`;

    const userPrompt = `جدول هذه المهام (${tasks?.length || 0}) في اليوم التالي:

التاريخ: ${date}

Prayer Windows المتاحة:
${prayerWindows?.map((w: any) => `
- ${w.window_name}: ${new Date(w.start_time).toLocaleTimeString('ar')} - ${new Date(w.end_time).toLocaleTimeString('ar')}
  المدة: ${w.duration_minutes} دقيقة
  مستوى الطاقة: ${w.energy_level}
  أنشطة مقترحة: ${w.recommended_activities.join(', ')}
`).join('\n') || 'لا توجد windows متاحة'}

الأحداث المجدولة:
${events?.map((e: any) => `- ${e.title}: ${new Date(e.starts_at).toLocaleTimeString('ar')} (${e.duration_min || 30} دقيقة)`).join('\n') || 'لا توجد أحداث'}

المهام المطلوب جدولتها:
${tasks?.map((t: any, i: number) => `${i + 1}. ${t.title} (أولوية: ${t.priority || 'متوسطة'})`).join('\n') || 'لا توجد مهام'}

اقترح:
1. في أي prayer window يجب جدولة كل مهمة
2. الوقت المحدد المقترح
3. المدة المقترحة لكل مهمة`;

    const response = await callLovableAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    const suggestion = response.choices[0].message.content;

    return json({
      ok: true,
      prayer_windows: prayerWindows,
      existing_events: events?.length || 0,
      suggestion
    });
  } catch (e) {
    console.error('[prayer-aware-plan]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
