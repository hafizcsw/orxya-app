import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { date } = await req.json();
    
    // Fetch user's profile for name
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const userName = profile?.display_name || "صديقي";

    // Fetch events for the day
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;
    
    const { data: events } = await supabaseClient
      .from("events")
      .select("title, starts_at, ends_at, location")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .gte("starts_at", startOfDay)
      .lte("ends_at", endOfDay)
      .order("starts_at", { ascending: true });

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          summary: `مرحباً ${userName}! لا توجد مهام مجدولة لهذا اليوم. استمتع بوقتك! 🌟` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for AI
    const eventsList = events.map((e, i) => {
      const time = new Date(e.starts_at).toLocaleTimeString("ar", { 
        hour: "2-digit", 
        minute: "2-digit" 
      });
      return `${i + 1}. ${e.title} - ${time}`;
    }).join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `أنت مساعد ودود يلخص جدول اليوم. اكتب رسالة ترحيبية قصيرة (سطر واحد فقط) باللغة العربية تتضمن:
- اسم المستخدم
- عدد المهام
- ذكر أهم 1-2 مهام فقط بشكل مختصر
استخدم لهجة ودودة ومحفزة. لا تستخدم رموز تعبيرية كثيرة.`
          },
          {
            role: "user",
            content: `الاسم: ${userName}
عدد المهام: ${events.length}
المهام:
${eventsList}

اكتب رسالة ترحيبية قصيرة (سطر واحد) بالعربية.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "يلزم إضافة رصيد إلى Lovable AI" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || 
      `مرحباً ${userName}! لديك ${events.length} مهام اليوم.`;

    return new Response(
      JSON.stringify({ summary: summary.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in daily-summary:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "حدث خطأ غير معروف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
