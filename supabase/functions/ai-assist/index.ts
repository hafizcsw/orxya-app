import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
  "content-type": "application/json; charset=utf-8",
};

const DAILY_USD_CAP = 1.5; // سقف يومي للكلفة

type Mode = "suggest_tasks" | "summarize_project" | "rewrite_title" | "split_subtasks";

interface ReqBody {
  mode: Mode;
  project_id?: string;
  task_id?: string;
  prompt?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = (await req.json()) as ReqBody;
    const { mode, project_id, task_id, prompt } = body;

    // 1️⃣ فحص السقف اليومي (Credit Saver)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const { data: spentRows } = await supabase
      .from("ai_runs")
      .select("cost_usd")
      .eq("owner_id", user.id)
      .gte("created_at", todayStart.toISOString());

    const spent = (spentRows ?? []).reduce((sum, r) => sum + Number(r.cost_usd || 0), 0);
    if (spent >= DAILY_USD_CAP) {
      return json({ ok: false, error: "DAILY_CAP_REACHED", spent, cap: DAILY_USD_CAP }, 429);
    }

    // 2️⃣ جلب السياق بحسب المود
    let context: any = {};
    if (mode === "suggest_tasks" || mode === "summarize_project") {
      if (!project_id) return json({ ok: false, error: "MISSING_PROJECT_ID" }, 400);
      
      const { data: project } = await supabase
        .from("projects")
        .select("id, name, status, priority, target, deadline, next_action, notes")
        .eq("id", project_id)
        .maybeSingle();
      
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, tags")
        .eq("project_id", project_id)
        .order("status")
        .order("order_pos");
      
      context = { project, tasks };
    } else if (mode === "rewrite_title" || mode === "split_subtasks") {
      if (!task_id) return json({ ok: false, error: "MISSING_TASK_ID" }, 400);
      
      const { data: task } = await supabase
        .from("tasks")
        .select("id, title, status")
        .eq("id", task_id)
        .maybeSingle();
      
      context = { task };
    }

    // 3️⃣ بناء الرسائل
    const messages = buildMessages(mode, prompt ?? "", context);

    // 4️⃣ استدعاء Lovable AI مع tool calling
    const tools = buildTools(mode);
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools,
        tool_choice: { type: "function", function: { name: getFunctionName(mode) } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return json({ ok: false, error: "RATE_LIMIT_EXCEEDED" }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ ok: false, error: "PAYMENT_REQUIRED" }, 402);
      }
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      return json({ ok: false, error: "AI_GATEWAY_ERROR" }, 500);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const usage = aiData.usage || { prompt_tokens: 0, completion_tokens: 0 };
    
    if (!toolCall) {
      return json({ ok: false, error: "NO_TOOL_CALL" }, 500);
    }

    const result = JSON.parse(toolCall.function.arguments);

    // 5️⃣ تقدير الكلفة (تقريبي)
    const costUsd = estimateCost(usage.prompt_tokens, usage.completion_tokens);

    // 6️⃣ تسجيل الاستخدام
    await supabase.from("ai_runs").insert({
      owner_id: user.id,
      mode,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      cost_usd: costUsd,
    });

    console.log(`AI assist ${mode}: tokens=${usage.prompt_tokens}+${usage.completion_tokens}, cost=$${costUsd}`);

    return json({ ok: true, mode, data: result, usage, cost_usd: costUsd });
  } catch (e) {
    console.error("ai-assist error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

function buildMessages(mode: Mode, prompt: string, ctx: any) {
  const system = "أنت مساعد ذكاء اصطناعي متخصص في إدارة المشاريع. أجب بالعربية بشكل مختصر ومفيد.";
  
  let userContent = "";
  switch (mode) {
    case "suggest_tasks":
      userContent = `المشروع: ${ctx.project?.name ?? ""}
الحالة: ${ctx.project?.status}
الأولوية: ${ctx.project?.priority}
الهدف: ${ctx.project?.target ?? ""}
الموعد النهائي: ${ctx.project?.deadline ?? "—"}

المهام الحالية:
${(ctx.tasks ?? []).map((t: any) => `- [${t.status}] ${t.title} (${t.due_date ?? "—"})`).join("\n")}

${prompt || "اقترح 3-5 مهام قابلة للتنفيذ خلال الأسبوع القادم."}`;
      break;

    case "summarize_project":
      userContent = `لخّص المشروع التالي واذكر: الملخص، المخاطر، نقاط الاختناق، والإجراء التالي المقترح.

المشروع: ${JSON.stringify(ctx.project, null, 2)}
المهام: ${JSON.stringify(ctx.tasks, null, 2)}`;
      break;

    case "rewrite_title":
      userContent = `أعد صياغة عنوان المهمة التالية لتكون مختصرة وواضحة وقابلة للتنفيذ:
"${ctx.task?.title ?? prompt}"

${prompt ? `ملاحظة إضافية: ${prompt}` : ""}`;
      break;

    case "split_subtasks":
      userContent = `قسّم المهمة التالية إلى خطوات تنفيذية صغيرة ومحددة (3-6 خطوات):
"${ctx.task?.title ?? prompt}"

${prompt ? `سياق إضافي: ${prompt}` : ""}`;
      break;
  }

  return [
    { role: "system", content: system },
    { role: "user", content: userContent },
  ];
}

function buildTools(mode: Mode) {
  const tools: any[] = [];

  if (mode === "suggest_tasks") {
    tools.push({
      type: "function",
      function: {
        name: "suggest_tasks",
        description: "اقتراح مهام قابلة للتنفيذ",
        parameters: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "عنوان المهمة" },
                  status: { type: "string", enum: ["todo", "doing"], description: "الحالة الافتراضية" },
                  due_date: { type: "string", description: "الموعد المقترح YYYY-MM-DD أو null" },
                  tags: { type: "array", items: { type: "string" }, description: "الوسوم" },
                },
                required: ["title", "status"],
              },
            },
          },
          required: ["tasks"],
        },
      },
    });
  } else if (mode === "summarize_project") {
    tools.push({
      type: "function",
      function: {
        name: "summarize_project",
        description: "تلخيص المشروع",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "ملخص المشروع" },
            risks: { type: "array", items: { type: "string" }, description: "المخاطر" },
            bottlenecks: { type: "array", items: { type: "string" }, description: "نقاط الاختناق" },
            next_action: { type: "string", description: "الإجراء التالي المقترح" },
          },
          required: ["summary", "risks", "bottlenecks", "next_action"],
        },
      },
    });
  } else if (mode === "rewrite_title") {
    tools.push({
      type: "function",
      function: {
        name: "rewrite_title",
        description: "إعادة صياغة عنوان المهمة",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "العنوان المعاد صياغته" },
          },
          required: ["title"],
        },
      },
    });
  } else if (mode === "split_subtasks") {
    tools.push({
      type: "function",
      function: {
        name: "split_subtasks",
        description: "تقسيم المهمة إلى خطوات فرعية",
        parameters: {
          type: "object",
          properties: {
            subtasks: { type: "array", items: { type: "string" }, description: "قائمة الخطوات الفرعية" },
          },
          required: ["subtasks"],
        },
      },
    });
  }

  return tools;
}

function getFunctionName(mode: Mode): string {
  const map: Record<Mode, string> = {
    suggest_tasks: "suggest_tasks",
    summarize_project: "summarize_project",
    rewrite_title: "rewrite_title",
    split_subtasks: "split_subtasks",
  };
  return map[mode];
}

function estimateCost(promptTokens: number, completionTokens: number): number {
  // تقدير تقريبي لـ Gemini Flash (قابل للتعديل)
  const perMillionIn = 0.075;  // $0.075 per 1M tokens
  const perMillionOut = 0.30;  // $0.30 per 1M tokens
  return (promptTokens / 1_000_000) * perMillionIn + (completionTokens / 1_000_000) * perMillionOut;
}
