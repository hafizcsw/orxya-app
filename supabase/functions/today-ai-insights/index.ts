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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
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

    const { currentTask, health, activities, upcomingEvents } = await req.json();

    // Prepare context for AI
    const currentTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    
    // Call Lovable AI (GPT-5-mini for speed and cost efficiency)
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
            content: `أنت مساعد إنتاجية ذكي. قم بتحليل جدول المستخدم اليومي وبيانات صحته وقدم:
1. تقييم الحالة الحالية (تركيز، طاقة) من 0-100
2. اقتراحات عملية قصيرة (جملة واحدة لكل اقتراح، max 3)
3. تحذيرات مهمة (إن وجدت)
4. توقع مستوى الطاقة: high, medium, low

استخدم اللغة العربية. كن مختصراً جداً وعملياً. لا تكرر المعلومات.`
          },
          {
            role: "user",
            content: `الوقت الحالي: ${currentTime}
المهمة الحالية: ${currentTask?.title || 'لا توجد مهمة'}
Recovery: ${health?.recovery || 0}%
Strain: ${health?.strain || 0}
ساعات العمل اليوم: ${activities?.work?.actual || 0}
ساعات الدراسة: ${activities?.study?.actual || 0}
المهام القادمة: ${upcomingEvents?.slice(0, 3).map((e: any) => e.title).join(', ') || 'لا توجد'}

قدم تحليلك الآن في JSON بهذا الشكل:
{
  "focusScore": 85,
  "energyLevel": "high",
  "suggestions": ["اقتراح 1", "اقتراح 2"],
  "warnings": []
}`
          }
        ],
        temperature: 0.7,
        max_tokens: 400
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
