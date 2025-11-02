import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok: false, error: "UNAUTH" }), { status: 401, headers: cors });

    const { intent = "plan_today", date = new Date().toISOString().slice(0, 10) } = await req.json().catch(() => ({}));

    const systemPrompt = `أنت مخطط ذكي. أنشئ JSON فقط بالصيغة:
{"tasks":[{"title":"...","status":"todo","due_date":"YYYY-MM-DD","estimate_min":30}],"events":[{"title":"...","starts_at":"ISO","ends_at":"ISO"}],"questions":["سؤال..."]}`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `التاريخ: ${date}, النوع: ${intent}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!r.ok) return new Response(JSON.stringify({ ok: false, error: "AI_ERROR" }), { status: 500, headers: cors });

    const aiResult = await r.json();
    const plan = JSON.parse(aiResult?.choices?.[0]?.message?.content ?? "{}");

    return new Response(JSON.stringify({
      ok: true, plan,
      metadata: { intent, date, tasks_count: plan.tasks?.length || 0, events_count: plan.events?.length || 0 }
    }), { headers: cors });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
