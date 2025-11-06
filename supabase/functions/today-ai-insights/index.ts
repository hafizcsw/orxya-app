import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const { 
      currentTask, 
      health, 
      activities, 
      upcomingEvents,
      timeOfDay,
      dayOfWeek,
      userGoals,
      recentTrends
    } = await req.json();

    // Prepare enhanced context for AI
    const now = new Date();
    const currentTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const timeOfDayAr = {
      morning: 'الصباح',
      afternoon: 'بعد الظهر',
      evening: 'المساء',
      night: 'الليل'
    };
    
    // Call Lovable AI with enhanced context
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت مساعد إنتاجية ذكي متخصص في تحليل الأنماط اليومية للمستخدمين.

قم بتحليل:
1. **الأنماط**: هل المستخدم منتج في هذا الوقت عادةً بناءً على البيانات التاريخية؟
2. **الطاقة**: بناءً على البيانات الصحية (Recovery, Strain, HRV)
3. **الأولويات**: ما المهم اليوم؟ هل هناك مهام عاجلة؟
4. **التوازن**: هل هناك توازن بين العمل والراحة؟
5. **الأهداف**: هل المستخدم على المسار الصحيح لتحقيق أهدافه؟

قدم:
- **focusScore**: درجة التركيز من 0-100
- **energyLevel**: مستوى الطاقة (low/medium/high)
- **suggestions**: 2-3 اقتراحات عملية محددة وقصيرة
- **warnings**: تحذيرات مهمة فقط (إن وجدت)

استخدم اللغة العربية. كن مختصراً وعملياً.`
          },
          {
            role: "user",
            content: `📅 **السياق**
الوقت: ${currentTime}
اليوم: ${dayOfWeek !== undefined ? dayNames[dayOfWeek] : 'غير محدد'}
فترة اليوم: ${timeOfDay ? timeOfDayAr[timeOfDay as keyof typeof timeOfDayAr] : 'غير محدد'}

📋 **المهمة الحالية**
${currentTask ? `${currentTask.title} (متبقي ${currentTask.remainingMinutes || 0} دقيقة)` : 'لا توجد مهمة حالياً'}

💪 **الحالة الصحية**
Recovery: ${health?.recovery || 0}%
Strain: ${health?.strain || 0}
Sleep Score: ${health?.sleep || 0}%
HRV: ${health?.hrv || 0}

📊 **النشاطات اليوم**
العمل: ${activities?.work?.actual || 0} من ${activities?.work?.goal || 8} ساعات
الدراسة: ${activities?.study?.actual || 0} من ${activities?.study?.goal || 2} ساعات
الرياضة: ${activities?.mma?.actual || 0} من ${activities?.mma?.goal || 1} ساعات
النوم: ${activities?.sleep?.actual || 0} من ${activities?.sleep?.goal || 8} ساعات

🎯 **الأهداف**
${userGoals && userGoals.length > 0 ? userGoals.map((g: any) => `${g.goal_type}: ${g.target_value}`).join('\n') : 'لا توجد أهداف محددة'}

📈 **الاتجاهات (آخر ${recentTrends?.totalDays || 0} أيام)**
${recentTrends ? `
متوسط العمل: ${recentTrends.avgWorkHours} ساعة
متوسط الدراسة: ${recentTrends.avgStudyHours} ساعة
متوسط الرياضة: ${recentTrends.avgSportsHours} ساعة
` : 'لا توجد بيانات كافية'}

⏭️ **المهام القادمة**
${upcomingEvents?.slice(0, 3).map((e: any) => e.title).join('\n') || 'لا توجد مهام قادمة'}

قدم تحليلك الآن في JSON بهذا الشكل:
{
  "focusScore": 85,
  "energyLevel": "high",
  "suggestions": ["اقتراح محدد وعملي 1", "اقتراح محدد وعملي 2"],
  "warnings": ["تحذير إن وجد"]
}`
          }
        ],
        max_completion_tokens: 500
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded",
          focusScore: 50,
          energyLevel: "medium",
          suggestions: ["جرب لاحقاً"],
          warnings: []
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    // Parse AI response (try to extract JSON)
    let insights;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       content.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insights = JSON.parse(jsonStr);
    } catch (e) {
      // Fallback if JSON parsing fails
      insights = {
        focusScore: 50,
        energyLevel: "medium",
        suggestions: [content || "استمر في العمل الجيد"],
        warnings: []
      };
    }

    return new Response(
      JSON.stringify(insights),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        focusScore: 50,
        energyLevel: "medium",
        suggestions: [],
        warnings: []
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  }
});
