import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "no_auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "bad_user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate input
    const InputSchema = z.object({
      text: z.string().min(1).max(500)
    });
    
    const rawBody = await req.json();
    const parseResult = InputSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(JSON.stringify({ 
        error: "invalid_input",
        details: parseResult.error.flatten()
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const { text } = parseResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // استخدام Lovable AI لتحليل النص
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
            content: `أنت مساعد لتحليل النصوص الطبيعية وتحويلها إلى أحداث تقويم. 
استخرج: العنوان، التاريخ، وقت البداية، المدة (بالدقائق)، الموقع (إن وُجد).
أمثلة:
- "غدًا 3 م: مكالمة عمر 45د @زووم" → {title: "مكالمة عمر", date: "tomorrow", start: "15:00", duration: 45, location: "زووم"}
- "اجتماع فريق يوم الأحد الساعة 10 صباحاً لمدة ساعة" → {title: "اجتماع فريق", date: "next sunday", start: "10:00", duration: 60}

أرجع JSON فقط بدون أي نص إضافي.`
          },
          { role: "user", content: text }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ error: "No AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تحليل الاستجابة
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // محاولة استخراج JSON من النص
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        return new Response(
          JSON.stringify({ error: "Could not parse AI response" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // تحويل التاريخ النسبي إلى ISO
    const now = new Date();
    let eventDate = now;
    
    if (parsed.date) {
      const dateStr = parsed.date.toLowerCase();
      if (dateStr.includes('tomorrow') || dateStr.includes('غد')) {
        eventDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (dateStr.includes('sunday') || dateStr.includes('الأحد')) {
        eventDate = new Date(now);
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        eventDate.setDate(now.getDate() + daysUntilSunday);
      }
      // يمكن إضافة المزيد من التحويلات هنا
    }

    // إنشاء حدث draft
    const startTime = parsed.start || "09:00";
    const [hours, minutes] = startTime.split(':');
    const startsAt = new Date(eventDate);
    startsAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const duration = parsed.duration || 60;
    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);

    // Validate parsed data before insertion
    const EventSchema = z.object({
      title: z.string().min(1).max(500),
      location: z.string().max(500).nullable().optional()
    });
    
    const validatedEvent = EventSchema.parse({
      title: parsed.title || text.substring(0, 500),
      location: parsed.location || null
    });
    
    const { data: event, error: insertError } = await sb
      .from("events")
      .insert({
        owner_id: user.id,
        title: validatedEvent.title,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        duration_min: duration,
        location: validatedEvent.location,
        is_draft: true,
        source: 'local'
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating draft event:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create event" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تسجيل في Analytics
    await sb.from("analytics_events").insert({
      user_id: user.id,
      kind: "calendar_nlp_quickadd",
      meta: { original_text: text, parsed }
    });

    return new Response(
      JSON.stringify({ event, parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("nlp-quickadd error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
