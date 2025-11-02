// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(x: any, s = 200) {
  return new Response(JSON.stringify(x), {
    status: s,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

const SYSTEM_PROMPT = `أنت "وكيل التخطيط" في تطبيق Oryxa. تساعد المستخدم على تخطيط يومه/أسبوعه.

قواعد صارمة:
- احترم دائمًا المنطقة الزمنية وتفضيلات المستخدم (نافذة DND، احترام الصلاة).
- تجنب الجدولة داخل نوافذ الصلاة؛ إذا كان لا مفر، اطلب تأكيدًا.
- إذا كانت المعلومات ناقصة (المدة، الموقع، وقت السفر)، اطرح أسئلة موجزة.
- استخدم الأدوات لـ: جلب السياق، إنشاء الأحداث/المهام، جدولة التنبيهات، اقتراح الفترات الفارغة، حل التعارضات.
- كن موجهًا نحو العمل: اقترح خطة + اطلب موافقة + نفّذ الأدوات.
- اجعل الرسائل قصيرة، مرقمة عند الحاجة، بالعربية افتراضيًا.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "fetch_context",
      description: "احصل على لمحة عن اليوم/الأسبوع (الأحداث، المهام، نوافذ الصلاة، التعارضات، التفضيلات).",
      parameters: {
        type: "object",
        properties: {
          horizon: { type: "string", enum: ["day", "week"] }
        },
        required: ["horizon"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "إنشاء حدث في التقويم.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          starts_at: { type: "string", description: "ISO datetime" },
          ends_at: { type: "string", description: "ISO datetime" },
          description: { type: "string" }
        },
        required: ["title", "starts_at", "ends_at"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "إنشاء مهمة.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          status: { type: "string", enum: ["todo", "doing", "done"] }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "suggest_slot",
      description: "اقترح أول فترة فارغة تلبي جميع القيود.",
      parameters: {
        type: "object",
        properties: {
          duration_min: { type: "number" },
          window: { type: "string", enum: ["today", "tomorrow", "week"] }
        },
        required: ["duration_min", "window"]
      }
    }
  }
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!openaiKey) {
      return json({ ok: false, error: "OPENAI_KEY_NOT_CONFIGURED" }, 500);
    }

    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    // التحقق من feature flag
    const { data: flags } = await sb.from("feature_flags")
      .select("enabled, pilot_user_ids")
      .eq("key", "agent.planner_enabled")
      .maybeSingle();

    const isEnabled = flags?.enabled || (flags?.pilot_user_ids || []).includes(user.id);
    if (!isEnabled) {
      return json({ ok: false, error: "FEATURE_OFF" }, 403);
    }

    const body = await req.json();
    const { thread_id, message } = body;

    // إنشاء أو جلب الخيط
    let tid = thread_id;
    if (!tid) {
      const { data: thread, error: threadErr } = await sb
        .from("agent_threads")
        .insert({
          owner_id: user.id,
          kind: "planner",
          title: "محادثة تخطيط"
        })
        .select("id")
        .single();

      if (threadErr) throw threadErr;
      tid = thread.id;
    }

    // حفظ رسالة المستخدم
    await sb.from("agent_messages").insert({
      thread_id: tid,
      owner_id: user.id,
      role: "user",
      content: { text: message }
    });

    // جلب تاريخ المحادثة
    const { data: history } = await sb
      .from("agent_messages")
      .select("role, content")
      .eq("thread_id", tid)
      .order("created_at", { ascending: true });

    const messages: any[] = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // بناء تاريخ المحادثة
    for (const msg of history || []) {
      if (msg.role === "user") {
        messages.push({ role: "user", content: msg.content.text });
      } else if (msg.role === "assistant") {
        messages.push({ role: "assistant", content: msg.content.text });
      }
    }

    // استدعاء OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return json({ ok: false, error: "OPENAI_ERROR", details: errText }, 500);
    }

    const result = await response.json();
    const choice = result.choices?.[0];
    
    if (!choice) {
      return json({ ok: false, error: "NO_RESPONSE" }, 500);
    }

    // معالجة tool calls
    const toolCalls = choice.message?.tool_calls || [];
    
    if (toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const funcName = toolCall.function.name;
        const funcArgs = JSON.parse(toolCall.function.arguments);
        
        let toolResult: any = { error: "UNKNOWN_TOOL" };

        try {
          if (funcName === "fetch_context") {
            const { data: profile } = await sb.from("profiles")
              .select("timezone, dnd_enabled, dnd_start, dnd_end, respect_prayer")
              .eq("id", user.id)
              .maybeSingle();

            const today = new Date();
            const start = new Date(today);
            const end = new Date(today);
            if (funcArgs.horizon === "week") end.setDate(end.getDate() + 7);

            const { data: events } = await sb.from("events")
              .select("id, title, starts_at, ends_at, source_id")
              .eq("owner_id", user.id)
              .gte("starts_at", start.toISOString())
              .lt("starts_at", end.toISOString())
              .order("starts_at");

            const { data: tasks } = await sb.from("tasks")
              .select("id, title, status, due_date")
              .eq("owner_id", user.id)
              .order("order_pos");

            const dateISO = today.toISOString().slice(0, 10);
            const { data: pt } = await sb.from("prayer_times")
              .select("fajr, dhuhr, asr, maghrib, isha")
              .eq("owner_id", user.id)
              .eq("date_iso", dateISO)
              .maybeSingle();

            const { data: conflicts } = await sb.from("conflicts")
              .select("id, event_id, prayer_name, date_iso")
              .eq("owner_id", user.id)
              .eq("status", "open");

            toolResult = {
              profile,
              events: events || [],
              tasks: tasks || [],
              prayer_times: pt,
              conflicts: conflicts || []
            };

          } else if (funcName === "create_event") {
            const { data, error } = await sb.from("events")
              .insert({
                owner_id: user.id,
                source_id: "ai",
                title: funcArgs.title,
                starts_at: funcArgs.starts_at,
                ends_at: funcArgs.ends_at,
                description: funcArgs.description || null
              })
              .select("id")
              .single();

            if (error) throw error;
            toolResult = { id: data.id, success: true };

          } else if (funcName === "create_task") {
            const { data, error } = await sb.from("tasks")
              .insert({
                owner_id: user.id,
                project_id: user.id, // default
                title: funcArgs.title,
                status: funcArgs.status || "todo",
                due_date: funcArgs.due_date || null
              })
              .select("id")
              .single();

            if (error) throw error;
            toolResult = { id: data.id, success: true };

          } else if (funcName === "suggest_slot") {
            const today = new Date();
            const base = funcArgs.window === "tomorrow" ? new Date(today.setDate(today.getDate() + 1)) : today;
            
            const start = new Date(base);
            start.setHours(8, 0, 0, 0);
            const end = new Date(base);
            end.setHours(20, 0, 0, 0);

            const { data: events } = await sb.from("events")
              .select("starts_at, ends_at")
              .eq("owner_id", user.id)
              .gte("starts_at", start.toISOString())
              .lt("starts_at", end.toISOString())
              .order("starts_at");

            // بحث بسيط عن أول فترة فارغة
            let current = start;
            for (const ev of events || []) {
              const evStart = new Date(ev.starts_at);
              const gap = (evStart.getTime() - current.getTime()) / 60000;
              
              if (gap >= funcArgs.duration_min) {
                toolResult = {
                  starts_at: current.toISOString(),
                  ends_at: new Date(current.getTime() + funcArgs.duration_min * 60000).toISOString()
                };
                break;
              }
              
              current = new Date(ev.ends_at || ev.starts_at);
            }

            if (!toolResult.starts_at) {
              const remaining = (end.getTime() - current.getTime()) / 60000;
              if (remaining >= funcArgs.duration_min) {
                toolResult = {
                  starts_at: current.toISOString(),
                  ends_at: new Date(current.getTime() + funcArgs.duration_min * 60000).toISOString()
                };
              } else {
                toolResult = { error: "NO_SLOT_AVAILABLE" };
              }
            }
          }
        } catch (e: any) {
          toolResult = { error: e.message || String(e) };
        }

        // حفظ نتيجة الأداة
        await sb.from("agent_messages").insert({
          thread_id: tid,
          owner_id: user.id,
          role: "tool",
          content: {
            tool_name: funcName,
            tool_args: funcArgs,
            tool_result: toolResult
          }
        });
      }

      // يمكن هنا استدعاء OpenAI مرة أخرى مع نتائج الأدوات
      // لكن للبساطة، سنعيد رسالة بسيطة
      const reply = "تم تنفيذ الأدوات. كيف يمكنني مساعدتك أكثر؟";
      
      await sb.from("agent_messages").insert({
        thread_id: tid,
        owner_id: user.id,
        role: "assistant",
        content: { text: reply }
      });

      return json({ ok: true, thread_id: tid, reply });
    }

    // إذا لم تكن هناك tool calls، احفظ رد المساعد
    const reply = choice.message?.content || "عذرًا، لم أفهم طلبك.";
    
    await sb.from("agent_messages").insert({
      thread_id: tid,
      owner_id: user.id,
      role: "assistant",
      content: { text: reply }
    });

    return json({ ok: true, thread_id: tid, reply });

  } catch (e: any) {
    console.error("planner-agent error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
