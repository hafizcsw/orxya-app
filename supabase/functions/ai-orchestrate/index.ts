// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

const tools = [
  {
    type: "function" as const,
    function: {
      name: "create_tasks",
      description: "إنشاء مهام متعددة وربطها بمشروع",
      parameters: {
        type: "object",
        properties: {
          project_id: { type: "string", nullable: true },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                due_date: { type: "string", nullable: true },
                status: { type: "string", enum: ["todo", "doing", "done"] },
              },
              required: ["title"]
            }
          }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "create_events",
      description: "إنشاء أحداث في التقويم",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                starts_at: { type: "string" },
                ends_at: { type: "string" },
                description: { type: "string", nullable: true }
              },
              required: ["title", "starts_at", "ends_at"]
            }
          },
          check_prayer_conflicts: { type: "boolean" }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "ask_user",
      description: "اطلب توضيحًا من المستخدم",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" }
        },
        required: ["question"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_KEY) {
      return json({ ok: false, error: "OPENAI_API_KEY not configured" }, 500);
    }

    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }

    const { session_id, message } = await req.json();
    if (!session_id || !message) {
      return json({ ok: false, error: "INVALID_INPUT" }, 400);
    }

    // Fetch session
    const { data: session } = await sb
      .from("ai_sessions")
      .select("id,owner_id,consent_read_calendar,consent_write_calendar,consent_write_tasks")
      .eq("id", session_id)
      .maybeSingle();

    if (!session || session.owner_id !== user.id) {
      return json({ ok: false, error: "FORBIDDEN" }, 403);
    }

    // Log user message
    await sb.from("ai_messages").insert({
      session_id,
      owner_id: user.id,
      role: "user",
      content: { text: message }
    });

    // Build system prompt
    const systemPrompt = [
      "أنت مساعد تنفيذي ذكي للمستخدم. مهمتك:",
      "- إنشاء مهام وأحداث قابلة للتنفيذ",
      "- اسأل عن أي معلومة ناقصة (التاريخ، الوقت، العنوان)",
      `- احترم الأذونات: consent_write_tasks=${session.consent_write_tasks}, consent_write_calendar=${session.consent_write_calendar}`,
      "- التواريخ بصيغة ISO (YYYY-MM-DD)",
      "- تجنب التعارض مع أوقات الصلاة"
    ].join(" ");

    // Fetch recent messages
    const { data: prev } = await sb
      .from("ai_messages")
      .select("role,content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(10);

    const messages = [
      { role: "system", content: systemPrompt },
      ...(prev ?? []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : (m.content.text ?? JSON.stringify(m.content))
      })),
      { role: "user", content: message }
    ];

    // Call OpenAI
    const reqBody = { model: MODEL, messages, tools, tool_choice: "auto" as const };
    
    const aiResp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(reqBody)
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("OpenAI error:", aiResp.status, errText);
      return json({ ok: false, error: "OPENAI_ERROR", details: errText }, 500);
    }

    const aiData = await aiResp.json();
    const choice = aiData?.choices?.[0];
    const toolCalls = choice?.message?.tool_calls ?? [];
    let assistantText = choice?.message?.content ?? "";

    // Handle tool calls
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      const args = JSON.parse(tc.function.arguments);

      if (toolName === "create_tasks") {
        if (!session.consent_write_tasks) {
          assistantText = "ليس لدي إذن لإنشاء مهام. يرجى تفعيل الإذن من الإعدادات.";
        } else {
          const items = args.items ?? [];
          for (const it of items) {
            await sb.from("tasks").insert({
              owner_id: user.id,
              project_id: args.project_id ?? null,
              title: it.title,
              status: it.status ?? "todo",
              order_pos: 1_000_000,
              due_date: it.due_date ?? null
            });
          }
          await sb.from("ai_actions").insert({
            session_id,
            tool: toolName,
            input: args,
            output: { created: items.length }
          });
          assistantText = `تم إنشاء ${items.length} مهمة.`;
        }
      }

      if (toolName === "create_events") {
        if (!session.consent_write_calendar) {
          assistantText = "ليس لدي إذن لإنشاء أحداث. يرجى تفعيل الإذن من الإعدادات.";
        } else {
          const items = args.items ?? [];
          let created = 0;
          for (const ev of items) {
            const ins = await sb.from("events").insert({
              owner_id: user.id,
              source: "ai",
              title: ev.title,
              starts_at: ev.starts_at,
              ends_at: ev.ends_at,
              description: ev.description ?? null,
              is_ai_created: true
            }).select("id").single();
            
            if (!ins.error) created++;
          }
          
          await sb.from("ai_actions").insert({
            session_id,
            tool: toolName,
            input: args,
            output: { created }
          });

          // Check prayer conflicts if requested
          if (args.check_prayer_conflicts !== false && items.length > 0) {
            const day = items[0].starts_at.slice(0, 10);
            await sb.functions.invoke("conflict-check", { body: { date: day } });
          }

          assistantText = `تم إنشاء ${created} حدث.`;
        }
      }

      if (toolName === "ask_user") {
        assistantText = args.question ?? "هل يمكن توضيح المطلوب؟";
        await sb.from("ai_actions").insert({
          session_id,
          tool: toolName,
          input: args,
          output: { asked: true }
        });
      }
    }

    // Save assistant response
    await sb.from("ai_messages").insert({
      session_id,
      owner_id: user.id,
      role: "assistant",
      content: { text: assistantText }
    });

    // Update session activity
    await sb.from("ai_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("id", session_id);

    return json({ ok: true, reply: assistantText, raw: aiData });
  } catch (e: any) {
    console.error("ai-orchestrate error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
