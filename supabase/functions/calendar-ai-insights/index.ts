import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Calendar AI Insights Function Started ===');
    
    // Get JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header');
      return new Response(
        JSON.stringify({ error: 'غير مصرح', details: 'Auth session missing!' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with SERVICE ROLE for admin access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from JWT (already verified by Supabase when verify_jwt = true)
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('Auth error:', userError?.message || 'No user');
      return new Response(
        JSON.stringify({ error: 'غير مصرح', details: 'Auth session missing!' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Authenticated user:', user.id);

    // Create user-scoped client for data operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { date, currentTime } = await req.json();
    console.log('Processing request for date:', date);
    
    // Get user profile for personalization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.display_name || 'صديقي';

    // Get events for the current day
    const { data: events, error: eventsError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('owner_id', user.id)
      .gte('starts_at', `${date}T00:00:00`)
      .lte('starts_at', `${date}T23:59:59`)
      .order('starts_at', { ascending: true });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return new Response(JSON.stringify({ error: 'فشل في جلب الأحداث' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get prayer times for today
    const { data: prayerTimes } = await supabaseClient
      .from('prayer_times')
      .select('*')
      .eq('owner_id', user.id)
      .eq('date', date)
      .single();

    // Current time context
    const now = new Date(currentTime || new Date());
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    // Find upcoming events (within next 2 hours)
    const upcomingEvents = events?.filter(event => {
      const eventTime = new Date(event.starts_at);
      const timeDiff = eventTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      return minutesDiff > 0 && minutesDiff <= 120; // Next 2 hours
    }) || [];

    // Find next prayer time
    let nextPrayer: { name: string; time: string } | null = null;
    if (prayerTimes) {
      const prayers = [
        { name: 'الفجر', time: prayerTimes.fajr },
        { name: 'الظهر', time: prayerTimes.dhuhr },
        { name: 'العصر', time: prayerTimes.asr },
        { name: 'المغرب', time: prayerTimes.maghrib },
        { name: 'العشاء', time: prayerTimes.isha },
      ].filter(p => p.time);

      for (const prayer of prayers) {
        if (prayer.time && prayer.time > currentTimeStr) {
          const [hour, minute] = prayer.time.split(':').map(Number);
          const prayerDate = new Date(now);
          prayerDate.setHours(hour, minute, 0, 0);
          const timeToPrayer = prayerDate.getTime() - now.getTime();
          const minutesToPrayer = timeToPrayer / (1000 * 60);
          
          if (minutesToPrayer > 0 && minutesToPrayer <= 120) {
            nextPrayer = { name: prayer.name, time: prayer.time };
            break;
          }
        }
      }
    }

    // Build context for AI
    const contextData = {
      userName,
      currentTime: currentTimeStr,
      dayPart: currentHour < 12 ? 'الصباح' : currentHour < 18 ? 'الظهيرة' : 'المساء',
      upcomingEvents: upcomingEvents.map(e => ({
        title: e.title,
        time: new Date(e.starts_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }),
        location: e.location,
        minutesUntil: Math.round((new Date(e.starts_at).getTime() - now.getTime()) / (1000 * 60))
      })),
      nextPrayer: nextPrayer ? {
        name: nextPrayer.name,
        time: nextPrayer.time,
        minutesUntil: Math.round((new Date(`${date}T${nextPrayer.time}`).getTime() - now.getTime()) / (1000 * 60))
      } : null,
      totalEventsToday: events?.length || 0
    };

    // Call Lovable AI for intelligent insights
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت مساعد ذكي للتقويم تساعد المستخدمين في إدارة وقتهم بشكل أفضل. 
مهمتك تحليل الوقت الحالي والأحداث القادمة وأوقات الصلاة وإعطاء ملخص قصير وذكي باللغة العربية.

إرشادات:
- كن ودوداً وشخصياً
- اذكر الأحداث المهمة القادمة (خصوصاً خلال 30 دقيقة القادمة)
- نبّه على أوقات الصلاة القادمة
- إذا كان هناك حدث قريب جداً (أقل من 20 دقيقة)، حث المستخدم على التحرك
- إذا كان هناك وقت صلاة قريب، ذكّر بعدم تفويته
- اجعل الرسالة قصيرة (2-3 جمل فقط)
- استخدم الرموز التعبيرية بشكل مناسب`;

    const userPrompt = `السياق الحالي:
- الاسم: ${contextData.userName}
- الوقت الحالي: ${contextData.currentTime} (${contextData.dayPart})
- عدد الأحداث اليوم: ${contextData.totalEventsToday}
${contextData.upcomingEvents.length > 0 ? `
- الأحداث القادمة:
${contextData.upcomingEvents.map(e => `  • ${e.title} - ${e.time} (بعد ${e.minutesUntil} دقيقة)${e.location ? ` في ${e.location}` : ''}`).join('\n')}
` : ''}
${contextData.nextPrayer ? `- صلاة ${contextData.nextPrayer.name} القادمة: ${contextData.nextPrayer.time} (بعد ${contextData.nextPrayer.minutesUntil} دقيقة)` : ''}

أعطِ ملخصاً ذكياً وشخصياً للمستخدم.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: "تجاوز حد الطلبات، يرجى المحاولة لاحقاً",
          fallback: `مرحباً ${userName}! ${contextData.upcomingEvents.length > 0 ? `لديك ${contextData.upcomingEvents.length} حدث قادم اليوم.` : 'يومك خالٍ من الأحداث.'}`
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: "يرجى إضافة رصيد لحساب Lovable AI",
          fallback: `مرحباً ${userName}! ${contextData.upcomingEvents.length > 0 ? `لديك ${contextData.upcomingEvents.length} حدث قادم اليوم.` : 'يومك خالٍ من الأحداث.'}`
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const insights = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      insights,
      contextData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calendar-ai-insights:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      insights: 'حدث خطأ في تحميل الرؤى الذكية' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});