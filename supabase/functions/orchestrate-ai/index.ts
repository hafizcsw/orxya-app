import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AiPlan, ActionScopes, TAction } from "../_shared/ai_schema.ts";

const cors = {
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"
};

const SYS_PROMPT = `You are "Orchestrator v1" for a personal OS. Arabic-first, concise, proactive.
Timezone: Asia/Dubai. Always respect prayer times and religious constraints.
Tools you can use via actions[]:
- create_task {project_id?, title, status?, due_date?}
- move_task {task_id, to_status, new_order_pos?}
- set_alarm {label, time_local}
- sync_prayers {}
- conflict_check {date_iso?}
- google_sync {}
- create_event_local {title, starts_at, ends_at, all_day?, location?}
- notify_local {title, body}
If info missing, ask specific question (assistant_reply). Output ONLY JSON object: {assistant_reply?, actions:[...]} matching schema.
Never schedule during Fajr/Isha windows without explicit confirmation.`;

async function getContext(supabase: any, userId: string) {
  const today = new Date().toISOString().slice(0,10);
  const [{ data: prof }, { data: prayers }, { data: tasks }, { data: nextEvt }] = await Promise.all([
    supabase.from("profiles").select("full_name,timezone,prayer_method,latitude,longitude").eq("id", userId).maybeSingle(),
    supabase.from("prayer_times").select("fajr,dhuhr,asr,maghrib,isha").eq("owner_id", userId).eq("date_iso", today).maybeSingle(),
    supabase.from("tasks").select("id,title,status,due_date,order_pos,project_id").eq("owner_id", userId).limit(100).order("status").order("order_pos"),
    supabase.from("events").select("title,starts_at,ends_at,all_day").eq("owner_id", userId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(8)
  ]);
  return { prof, prayers, tasks, next_events: nextEvt ?? [] };
}

async function hasScopes(supabase:any, userId:string, scopes:string[]) {
  if (!scopes.length) return true;
  const { data } = await supabase.from("ai_consent").select("scope,granted,expires_at").eq("owner_id", userId).in("scope", scopes);
  const ok = (data ?? []).filter((r: any) => r.granted && (!r.expires_at || new Date(r.expires_at) > new Date())).map((r: any)=>r.scope);
  return scopes.every(s => ok.includes(s));
}

async function ensureConsentOrQueueAsk(plan: any, supabase:any, userId:string) {
  const missing = new Set<string>();
  for (const a of plan.actions ?? []) {
    const need = ActionScopes[a.type] ?? [];
    if (need.length) {
      const ok = await hasScopes(supabase, userId, need);
      if (!ok) need.forEach(s => missing.add(s));
    }
  }
  if (missing.size) {
    plan.actions.unshift({
      type: "ask_consent",
      payload: { scopes: Array.from(missing), message: "أحتاج إذنك للقيام بهذه الإجراءات." }
    });
  }
  return plan;
}

async function executeAction(supabase:any, userId:string, sessionId:string|null, act:TAction) {
  switch (act.type) {
    case "create_task": {
      const payload = act.payload;
      const { error } = await supabase.functions.invoke("commands", {
        body: { command:"add_task", idempotency_key: crypto.randomUUID(), payload }
      });
      return { ok: !error, result: null };
    }
    case "move_task": {
      const p = act.payload;
      const { error } = await supabase.functions.invoke("commands", {
        body: { command:"move_task", idempotency_key: crypto.randomUUID(), payload: p }
      });
      return { ok: !error, result: null };
    }
    case "set_alarm": {
      const p = act.payload;
      const { error } = await supabase.functions.invoke("commands", {
        body: { command:"set_alarm", idempotency_key: crypto.randomUUID(), payload: p }
      });
      return { ok: !error, result: null };
    }
    case "sync_prayers": {
      const { error } = await supabase.functions.invoke("prayer-sync", { body: { days:1 }});
      return { ok: !error, result: null };
    }
    case "conflict_check": {
      const p = act.payload ?? {};
      const { error } = await supabase.functions.invoke("conflict-check", { body: { date: p.date_iso ?? new Date().toISOString().slice(0,10) }});
      return { ok: !error, result: null };
    }
    case "google_sync": {
      const { error } = await supabase.functions.invoke("gcal-sync", { body: {} });
      return { ok: !error, result: null };
    }
    case "create_event_local": {
      const row = {
        owner_id: userId,
        source: "local",
        ext_id: crypto.randomUUID(),
        title: String(act.payload.title ?? "Untitled"),
        starts_at: String(act.payload.starts_at),
        ends_at: String(act.payload.ends_at),
        all_day: !!act.payload.all_day,
        location: act.payload.location ?? null
      };
      const { error } = await supabase.from("events").upsert(row, { onConflict: "owner_id,source,ext_id" });
      return { ok: !error, result: null };
    }
    case "notify_local": {
      const p = act.payload;
      const { error } = await supabase.from("notifications").insert({
        owner_id: userId, label: p.title ?? "تنبيه", time_local: null, body: p.body ?? null, enabled: true
      });
      return { ok: !error, result: null };
    }
    case "ask_consent": {
      return { ok: true, result: { ask: act.payload } };
    }
    default:
      return { ok: false, error: "UNKNOWN_ACTION" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ ok:false, error:"UNAUTHENTICATED" }), { status:401, headers: { ...cors, "content-type": "application/json" } });

    const body = await req.json().catch(()=>({}));
    const sessionId: string | null = body.session_id ?? null;
    const userText: string = String(body.message ?? "").slice(0, 4000);

    const ctx = await getContext(supabase, user.id);

    const messages = [
      { role: "system", content: SYS_PROMPT },
      { role: "user", content: `Context:\n${JSON.stringify(ctx)}\n\nUser: ${userText}\n\nOutput JSON only, matching schema.` }
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers: { "content-type":"application/json", "authorization":`Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages
      })
    });

    const j = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";

    let plan = AiPlan.safeParse(JSON.parse(raw));
    if (!plan.success) {
      plan = { success:true, data:{ assistant_reply: "لم أفهم تمامًا المطلوب. ما الذي تحب أن أفعله؟", actions: [] } } as any;
    }

    const finalPlan = await ensureConsentOrQueueAsk(plan.data, supabase, user.id);

    const sessId = sessionId ?? crypto.randomUUID();
    if (!sessionId) {
      await supabase.from("ai_sessions_v2").insert({ id: sessId, owner_id: user.id }).select("id");
    }
    await supabase.from("ai_messages_v2").insert([
      { session_id: sessId, role: "user", content: { text: userText } },
      { session_id: sessId, role: "assistant", content: { plan: finalPlan } }
    ]);

    const results:any[] = [];
    for (const a of finalPlan.actions) {
      if (a.type === "ask_consent") continue;
      const okScopes = await hasScopes(supabase, user.id, ActionScopes[a.type] ?? []);
      if (!okScopes) continue;
      const r = await executeAction(supabase, user.id, sessId, a as TAction);
      results.push({ type: a.type, ok: r.ok, error: r.error ?? null });
    }

    return new Response(JSON.stringify({
      ok:true,
      session_id: sessId,
      reply: finalPlan.assistant_reply ?? null,
      actions: finalPlan.actions,
      results
    }), { headers: { ...cors, "content-type":"application/json" }});

  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: String(e) }), { status:500, headers: { ...cors, "content-type":"application/json" }});
  }
});
