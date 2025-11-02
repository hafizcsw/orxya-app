// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// === Utilities ===
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function authFrom(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";

// === Types ===
type Action =
  | { type: "connect_google" }
  | { type: "sync_gcal" }
  | { type: "location_update"; lat: number; lon: number }
  | { type: "prayer_sync"; date?: string; days?: number }
  | { type: "conflict_check"; days_back?: number; days_fwd?: number }
  | { type: "create_task"; project_id: string; title: string; status?: "todo" | "doing" | "done"; due_date?: string | null }
  | { type: "move_task"; task_id: string; to_status: "todo" | "doing" | "done"; new_order_pos?: number }
  | { type: "create_event"; title: string; start_ts: string; end_ts: string; location?: string | null; description?: string | null }
  | { type: "reschedule_event"; event_id: string; start_ts: string; end_ts: string }
  | { type: "set_alarm"; label: string; time_local: string };

type AgentReply = {
  assistant_message: string;
  actions: Action[];
  tips?: string[];
};

// === OpenAI call ===
async function callOpenAI(prompt: string, data: any): Promise<AgentReply> {
  const sys = `
أنت وكيل ذكي يتحكم في نظام إنتاج حقيقي. اخرج JSON فقط بالشكل:
{"assistant_message":"...","actions":[...], "tips":["..."]}

القدرات:
- connect_google: بدء ربط تقويم Google
- sync_gcal: مزامنة تقويم Google
- location_update: lat, lon
- prayer_sync: date(YYYY-MM-DD), days
- conflict_check: days_back, days_fwd
- create_task: project_id, title, (status), (due_date)
- move_task: task_id, to_status, (new_order_pos)
- create_event: title, start_ts, end_ts, (location), (description)
- reschedule_event: event_id, start_ts, end_ts
- set_alarm: label, time_local (HH:MM)

قيود:
- لا تغيّر حالة المستخدم الدينية؛ استعملها فقط لتجنّب التعارضات (الصلاة).
- راعِ المنطقة الزمنية، واحترم خصوصية البيانات.
- إنْ نقصت معلومة حرجة لإنجاز فعل، اسأل المستخدم بسؤال محدد، وأخرج الإجراء الناقص فقط بعد الحصول عليه.
- إذا ذكرت الصلاة أو موقع المستخدم غير محدد/متغيّر، اقترح location_update ثم prayer_sync ثم conflict_check.
- عند الحديث عن الاجتماعات: اقترح إعادة الجدولة إن تعارضت مع الصلاة وقدّم window قبل/بعد الصلاة.

أعد JSON فقط بلا أي نص خارجه.
`.trim();

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: prompt },
      { role: "assistant", content: `سياق المستخدم/الحالة:\n${JSON.stringify(data).slice(0, 8000)}` },
    ],
    temperature: 0.2,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  const j = await r.json();
  
  if (!r.ok) {
    console.error("OpenAI API error:", j);
    throw new Error(j?.error?.message || "openai_failed");
  }

  const text = j.choices?.[0]?.message?.content ?? "{}";
  let parsed: AgentReply;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { assistant_message: "لم أفهم. أعد الصياغة.", actions: [] };
  }
  parsed.actions ??= [];
  parsed.tips ??= [];
  return parsed;
}

// === Executors ===
async function execAction(supabase: any, user_id: string, a: Action) {
  if (a.type === "connect_google") {
    const { data, error } = await supabase.functions.invoke("oauth-gcal-start", { body: {} });
    if (error) throw error;
    return { ok: true, type: a.type, url: data?.url };
  }
  if (a.type === "sync_gcal") {
    const { error, data } = await supabase.functions.invoke("gcal-sync", { body: {} });
    if (error) throw error;
    return { ok: true, type: a.type, meta: data };
  }
  if (a.type === "location_update") {
    const { error, data } = await supabase.functions.invoke("location-update", {
      body: { latitude: a.lat, longitude: a.lon },
    });
    if (error) throw error;
    return { ok: true, type: a.type, meta: data };
  }
  if (a.type === "prayer_sync") {
    const { error, data } = await supabase.functions.invoke("prayer-sync", {
      body: { date: a.date, days: a.days ?? 1 },
    });
    if (error) throw error;
    return { ok: true, type: a.type, meta: data };
  }
  if (a.type === "conflict_check") {
    const { error, data } = await supabase.functions.invoke("conflict-check", {
      body: { days_back: a.days_back ?? 0, days_fwd: a.days_fwd ?? 3 },
    });
    if (error) throw error;
    return { ok: true, type: a.type, meta: data };
  }
  if (a.type === "create_task") {
    const row = {
      owner_id: user_id,
      project_id: a.project_id,
      title: a.title,
      status: a.status ?? "todo",
      due_date: a.due_date ?? null,
      order_pos: 2147483647,
    };
    const { error, data } = await supabase.from("tasks").insert(row).select("id").single();
    if (error) throw error;
    return { ok: true, type: a.type, id: data?.id };
  }
  if (a.type === "move_task") {
    const patch: any = { status: a.to_status };
    if (a.new_order_pos != null) patch.order_pos = a.new_order_pos;
    const { error, data } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", a.task_id)
      .eq("owner_id", user_id)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, type: a.type, id: data?.id };
  }
  if (a.type === "create_event") {
    const row = {
      owner_id: user_id,
      title: a.title,
      starts_at: a.start_ts,
      ends_at: a.end_ts,
      source_id: "local",
    };
    const { error, data } = await supabase.from("events").insert(row).select("id").single();
    if (error) throw error;
    return { ok: true, type: a.type, id: data?.id };
  }
  if (a.type === "reschedule_event") {
    const { error, data } = await supabase
      .from("events")
      .update({ starts_at: a.start_ts, ends_at: a.end_ts })
      .eq("id", a.event_id)
      .eq("owner_id", user_id)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, type: a.type, id: data?.id };
  }
  if (a.type === "set_alarm") {
    const body = {
      command: "set_alarm",
      idempotency_key: crypto.randomUUID(),
      payload: { label: a.label, time_local: a.time_local },
    };
    const { error, data } = await supabase.functions.invoke("commands", { body });
    if (error) throw error;
    return { ok: true, type: a.type, meta: data };
  }
  return { ok: false, type: (a as any).type, error: "unsupported_action" };
}

// === Serve ===
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { supabase, user } = await authFrom(req);
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    if (!message) return json({ ok: false, error: "EMPTY_MESSAGE" }, 400);

    // === Context snapshot ===
    const [profQ, conflictQ, projectsQ] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, timezone, prayer_method, latitude, longitude")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("conflicts")
        .select("id,type,event_start,event_end,meta,prayer_name")
        .eq("owner_id", user.id)
        .eq("status", "open")
        .gte("event_start", new Date().toISOString())
        .order("event_start", { ascending: true })
        .limit(5),
      supabase.from("projects").select("id,name,status").eq("owner_id", user.id).limit(10),
    ]);
    
    const profile = profQ.data ?? null;
    const conflicts = conflictQ.data ?? [];
    const projects = projectsQ.data ?? [];

    const todayISO = new Date().toISOString().slice(0, 10);
    const ptQ = await supabase
      .from("prayer_times")
      .select("fajr,dhuhr,asr,maghrib,isha")
      .eq("owner_id", user.id)
      .eq("date_iso", todayISO)
      .maybeSingle();
    const prayers = ptQ.data ?? null;

    // Check Google connection status
    const { data: googleAcc } = await supabase
      .from("external_accounts")
      .select("status")
      .eq("owner_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    const ctx = {
      profile,
      today_prayers: prayers,
      upcoming_conflicts: conflicts,
      projects,
      google_connected: googleAcc?.status === "connected",
    };

    // === Ask OpenAI ===
    const reply = await callOpenAI(message, ctx);

    // === Execute actions sequentially ===
    const results = [];
    for (const a of reply.actions) {
      try {
        const r = await execAction(supabase, user.id, a);
        results.push({ action: a, result: r });
      } catch (e: any) {
        console.error(`Action ${a.type} failed:`, e);
        results.push({ action: a, error: String(e?.message ?? e) });
      }
    }

    console.log(`Agent processed message for user ${user.id}: ${results.length} actions`);

    return json({
      ok: true,
      assistant_message: reply.assistant_message,
      applied_actions: results,
      tips: reply.tips ?? [],
    });
  } catch (e) {
    console.error("agent-hub error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
