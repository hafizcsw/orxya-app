import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, includeContext = true } = await req.json();
    
    let contextData: any = null;

    if (includeContext) {
      // Fetch all user context
      const today = new Date().toISOString().split('T')[0];
      const now = new Date();

      // Get today's activities
      const { data: activities } = await supabase
        .from('vw_today_activities')
        .select('*')
        .eq('owner_id', user.id)
        .eq('day', today)
        .single();

      // Get current and next tasks
      const { data: currentTask } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .lte('starts_at', now.toISOString())
        .gte('ends_at', now.toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      const { data: nextTask } = await supabase
        .from('events')
        .select('*')
        .eq('owner_id', user.id)
        .gt('starts_at', now.toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      // Get user goals
      const { data: goals } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Get recent health data
      const { data: healthSamples } = await supabase
        .from('health_samples')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(10);

      contextData = {
        currentTime: now.toISOString(),
        currentDay: today,
        currentTask: currentTask || null,
        nextTask: nextTask || null,
        todayActivities: activities || {
          work_hours: 0,
          study_hours: 0,
          sports_hours: 0,
          walk_minutes: 0,
        },
        goals: goals || [],
        recentHealth: healthSamples || [],
      };
    }

    // Build system prompt with context
    const systemPrompt = `أنت مساعد ذكي شخصي متخصص في تحليل البيانات وتقديم النصائح.

${includeContext && contextData ? `
السياق الحالي:
- الوقت الحالي: ${new Date(contextData.currentTime).toLocaleString('ar-SA')}
- اليوم: ${contextData.currentDay}

${contextData.currentTask ? `المهمة الحالية:
- العنوان: ${contextData.currentTask.title}
- تبدأ: ${new Date(contextData.currentTask.starts_at).toLocaleTimeString('ar-SA')}
- تنتهي: ${new Date(contextData.currentTask.ends_at).toLocaleTimeString('ar-SA')}
` : 'لا توجد مهمة حالية'}

${contextData.nextTask ? `المهمة القادمة:
- العنوان: ${contextData.nextTask.title}
- تبدأ: ${new Date(contextData.nextTask.starts_at).toLocaleTimeString('ar-SA')}
` : 'لا توجد مهام قادمة اليوم'}

نشاطات اليوم:
- ساعات العمل: ${contextData.todayActivities.work_hours.toFixed(1)} ساعة
- ساعات الدراسة: ${contextData.todayActivities.study_hours.toFixed(1)} ساعة
- ساعات الرياضة: ${contextData.todayActivities.sports_hours.toFixed(1)} ساعة
- دقائق المشي: ${contextData.todayActivities.walk_minutes} دقيقة

${contextData.goals.length > 0 ? `الأهداف النشطة:
${contextData.goals.map((g: any) => `- ${g.goal_type}: ${g.target_value} (${g.period})`).join('\n')}
` : 'لا توجد أهداف محددة'}

${contextData.recentHealth.length > 0 ? `البيانات الصحية الأخيرة متوفرة` : 'لا توجد بيانات صحية'}
` : ''}

مهمتك:
1. تحليل البيانات المتوفرة
2. تقديم رؤى واضحة ومفيدة
3. اقتراح تحسينات وتوصيات
4. الإجابة على الأسئلة بطريقة ودية ومحفزة

كن موجزاً ومباشراً في إجاباتك. استخدم اللغة العربية الفصحى البسيطة.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'تجاوزت الحد المسموح من الطلبات. حاول مرة أخرى لاحقاً.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'يرجى إضافة رصيد لمواصلة استخدام الذكاء الاصطناعي.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      return new Response(JSON.stringify({ error: 'خطأ في الاتصال بالذكاء الاصطناعي' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in ai-chat-insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
