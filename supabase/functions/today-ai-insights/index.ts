import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIInsights {
  focusScore: number;
  energyLevel: 'low' | 'medium' | 'high';
  suggestions: string[];
  warnings: string[];
  model_version: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { date } = await req.json();
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Fetch user data for AI analysis
    const [healthRes, activitiesRes, eventsRes] = await Promise.all([
      supabaseClient
        .from('signals_daily')
        .select('hrv_z, sleep_score, recovery_percent, strain_score, steps')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .maybeSingle(),
      supabaseClient
        .from('vw_today_activities')
        .select('work_hours, study_hours, sports_hours, sleep_hours, walk_minutes')
        .eq('day', targetDate)
        .maybeSingle(),
      supabaseClient
        .from('events')
        .select('title, starts_at, ends_at')
        .eq('owner_id', user.id)
        .gte('starts_at', `${targetDate}T00:00:00Z`)
        .lte('starts_at', `${targetDate}T23:59:59Z`)
        .order('starts_at', { ascending: true })
        .limit(15)
    ]);

    const health = healthRes.data || {};
    const activities = activitiesRes.data || {};
    const upcomingEvents = eventsRes.data || [];

    // Build context for AI
    const contextData = {
      health: {
        hrv_z: health.hrv_z ?? null,
        sleep_score: health.sleep_score ?? null,
        recovery_percent: health.recovery_percent ?? null,
        strain_score: health.strain_score ?? null,
        steps: health.steps ?? null,
      },
      activities: {
        work_hours: activities.work_hours ?? 0,
        study_hours: activities.study_hours ?? 0,
        sports_hours: activities.sports_hours ?? 0,
        sleep_hours: activities.sleep_hours ?? 0,
        walk_minutes: activities.walk_minutes ?? 0,
      },
      events: upcomingEvents.map(e => ({
        title: e.title,
        time: new Date(e.starts_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
      })),
      date: targetDate
    };

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `أنت مساعد ذكي يُحلّل بيانات المستخدم اليومية ويقدّم رؤى شخصية.
مهمتك: تقييم التركيز والطاقة وتقديم 2-3 اقتراحات قابلة للتنفيذ و0-2 تحذيرات إن لزم.

قواعد:
- focusScore: 0-100 (اعتمد على النوم، HRV، ساعات العمل/الدراسة)
- energyLevel: low/medium/high (اعتمد على Recovery، Sleep Score، HRV)
- suggestions: نصائح قصيرة وواضحة بالعربية
- warnings: تحذيرات فقط عند الحاجة (نوم سيء، إرهاق، ضغط مرتفع)
- لا تُختلق بيانات: إن كان الحقل null، تجاهله في التحليل`;

    const userPrompt = `البيانات اليومية (${targetDate}):
صحة: نوم=${contextData.health.sleep_score ?? 'غير متوفر'}/100، HRV_z=${contextData.health.hrv_z ?? 'غير متوفر'}، استشفاء=${contextData.health.recovery_percent ?? 'غير متوفر'}%، إجهاد=${contextData.health.strain_score ?? 'غير متوفر'}/21، خطوات=${contextData.health.steps ?? 'غير متوفر'}
أنشطة: عمل=${contextData.activities.work_hours}h، دراسة=${contextData.activities.study_hours}h، رياضة=${contextData.activities.sports_hours}h، نوم=${contextData.activities.sleep_hours}h، مشي=${contextData.activities.walk_minutes}min
أحداث اليوم (${contextData.events.length}): ${contextData.events.map(e => `${e.title} (${e.time})`).join(', ') || 'لا توجد'}

حلّل وأعطِ رؤى ذكية.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_insights',
            description: 'إنشاء رؤى ذكية من البيانات اليومية',
            parameters: {
              type: 'object',
              properties: {
                focusScore: {
                  type: 'number',
                  description: 'درجة التركيز من 0-100',
                  minimum: 0,
                  maximum: 100
                },
                energyLevel: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'مستوى الطاقة'
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'اقتراحات قابلة للتنفيذ (2-3)',
                  minItems: 0,
                  maxItems: 3
                },
                warnings: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'تحذيرات إن لزم (0-2)',
                  minItems: 0,
                  maxItems: 2
                }
              },
              required: ['focusScore', 'energyLevel', 'suggestions', 'warnings'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'generate_insights' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'تم تجاوز الحد - حاول لاحقًا' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'الرجاء إضافة رصيد لـ Lovable AI' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    
    const insights: AIInsights = {
      focusScore: Math.round(parsedArgs.focusScore),
      energyLevel: parsedArgs.energyLevel,
      suggestions: parsedArgs.suggestions || [],
      warnings: parsedArgs.warnings || [],
      model_version: 'gemini-2.5-flash'
    };

    console.log('AI Insights generated:', { date: targetDate, focusScore: insights.focusScore });

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in today-ai-insights:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
