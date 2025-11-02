import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AIRequest {
  mode: 'plan_my_day' | 'triage_conflicts' | 'task_extractor' | 'agenda_brief' | 'prayer_guard' | 'chat';
  message?: string;
  context?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { mode, message, context }: AIRequest = await req.json();

    console.log('🤖 AI Orchestrator:', { mode, userId: user.id });

    // جلب معلومات المستخدم
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // بناء System Prompt حسب الوضع
    const systemPrompt = getSystemPrompt(mode, profile);

    // استدعاء OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message || `${mode}: ${JSON.stringify(context)}` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('✅ AI Response generated');

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        mode 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Orchestrator error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function getSystemPrompt(mode: string, profile: any): string {
  const basePrompt = `أنت مساعد ذكي شخصي يتحدث العربية بطلاقة. اسم المستخدم: ${profile?.display_name || 'المستخدم'}.`;

  const prompts: Record<string, string> = {
    plan_my_day: `${basePrompt}

مهمتك: تخطيط يوم المستخدم بذكاء مع مراعاة:
- مواقيت الصلاة (إن كان مسلمًا)
- الأحداث الموجودة في التقويم
- المهام ذات الأولوية
- فترات الراحة والمرونة

قدم خطة واضحة بصيغة JSON:
{
  "greeting": "رسالة ترحيبية",
  "plan": [
    {"time": "09:00", "activity": "النشاط", "type": "task|prayer|break|event", "priority": "high|medium|low"}
  ],
  "summary": "ملخص اليوم"
}`,

    triage_conflicts: `${basePrompt}

مهمتك: تحليل التعارضات في الجدول وتقديم حلول ذكية.

قدم الحل بصيغة JSON:
{
  "conflicts": [
    {
      "description": "وصف التعارض",
      "severity": "high|medium|low",
      "solutions": ["حل 1", "حل 2"]
    }
  ],
  "recommendation": "التوصية الأفضل"
}`,

    task_extractor: `${basePrompt}

مهمتك: استخراج المهام من النص الحر وتصنيفها.

قدم النتيجة بصيغة JSON:
{
  "tasks": [
    {
      "title": "عنوان المهمة",
      "priority": "high|medium|low",
      "category": "work|personal|study|health",
      "deadline": "ISO date or null"
    }
  ]
}`,

    agenda_brief: `${basePrompt}

مهمتك: تلخيص أجندة اليوم بشكل موجز وجذاب.

قدم ملخصًا عربيًا واضحًا يشمل:
- عدد المهام والأحداث
- الأولويات
- مواقيت الصلاة المهمة
- تذكيرات ذكية`,

    prayer_guard: `${basePrompt}

مهمتك: حماية مواقيت الصلاة من التعارضات.

عند وجود تعارض مع الصلاة، قدم:
{
  "alert": "تنبيه واضح بالعربية",
  "prayer_time": "وقت الصلاة",
  "conflicting_event": "الحدث المتعارض",
  "suggestion": "اقتراح للحل (تأجيل، تقديم، إلغاء...)"
}`,

    chat: `${basePrompt}

أنت مساعد ودود وذكي. تجيب على الأسئلة بوضوح وتساعد في:
- تنظيم المهام والمشاريع
- التذكير بالمواعيد
- تقديم النصائح الإنتاجية
- احترام الخصوصية والدين`
  };

  return prompts[mode] || prompts.chat;
}
