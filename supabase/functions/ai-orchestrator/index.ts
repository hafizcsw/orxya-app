// Epic 8: AI Executive Layer - Orchestrator
// OpenAI-only | JSON Schema | Draft-first
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Intent = "plan_my_day" | "resolve_conflicts" | "daily_briefing" | "budget_guard" | "what_if";
type ReqBase = { 
  intent: Intent; 
  apply?: boolean; 
  calendar_window?: { start: string; end: string }; 
  input?: any; 
  preferences?: any; 
  constraints?: any; 
  ghost?: boolean 
};
type PlanItem = { title: string; start: string; end: string; kind: string; source?: string; confidence?: number; draft?: boolean };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const OPENAI_MODEL   = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY       = Deno.env.get("SUPABASE_ANON_KEY")!;
const TZ_DEFAULT     = Deno.env.get("TZ_DEFAULT") ?? "Asia/Dubai";

// ---------- Helpers ----------
function httpJson(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function bad(msg: string, status = 400) { return httpJson({ error: msg }, status); }
function isoDateInTZ(ts: string | Date, tz: string) {
  // Returns ISO date (yyyy-mm-dd) for ts in tz (approx; server is UTC; DB is timestamptz)
  const dt = typeof ts === "string" ? new Date(ts) : ts;
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [y, m, d] = fmt.format(dt).split("-");
  return `${y}-${m}-${d}`;
}
async function openaiJSON(system: string, user: unknown, schemaName: string, schema: unknown) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_schema", json_schema: { name: schemaName, schema, strict: true } },
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(user) },
      ],
    })
  });
  if (!resp.ok) throw new Error(`openai_${resp.status}`);
  const json = await resp.json();
  const out = json.choices?.[0]?.message?.content;
  if (!out) throw new Error("openai_empty");
  return JSON.parse(out);
}

// ---------- DB fetchers ----------
async function fetchContext(supabase: any, userId: string, window: { start: string; end: string }) {
  const tz = TZ_DEFAULT;
  // events in window
  const { data: events } = await supabase
    .from("events")
    .select("id,title,start_at,end_at,location,source,tags")
    .gte("start_at", window.start).lte("start_at", window.end).order("start_at");
  // conflicts today
  const { data: conflicts } = await supabase
    .from("conflicts")
    .select("id,kind,severity,created_at,meta")
    .gte("created_at", window.start).lte("created_at", window.end).order("created_at", { ascending: false });
  // daily metrics (view > mv handled by SQL fn)
  const startDay = isoDateInTZ(window.start, tz);
  const endDay   = isoDateInTZ(window.end, tz);
  const { data: dm } = await supabase.rpc("get_daily_metrics", { p_user_id: userId, p_start: startDay, p_end: endDay });
  // prayers today (assume table prayer_times with day + times in local tz)
  const { data: prayers } = await supabase
    .from("prayer_times")
    .select("*")
    .gte("day", startDay).lte("day", endDay).order("day");

  return { tz, events: events ?? [], conflicts: conflicts ?? [], daily_metrics: dm ?? [], prayers: prayers ?? [] };
}

// ---------- Event operations (Draft-first) ----------
async function shiftEventBy(supabase: any, userId: string, eventId: string, minutes: number, apply: boolean) {
  // Read event
  const { data: ev, error } = await supabase.from("events").select("id,start_at,end_at,title,is_draft").eq("id", eventId).single();
  if (error || !ev) throw new Error("event_not_found");
  const start = new Date(ev.start_at); const end = new Date(ev.end_at);
  const byMs = minutes * 60_000;
  const newStart = new Date(start.getTime() + byMs).toISOString();
  const newEnd   = new Date(end.getTime() + byMs).toISOString();

  if (apply) {
    const { error: upErr } = await supabase.from("events").update({ start_at: newStart, end_at: newEnd }).eq("id", eventId);
    if (upErr) throw new Error("event_update_failed");
    return { applied: true, event_id: eventId, newStart, newEnd };
  } else {
    // Ghost draft: create draft overlay (if ff_ghost_schedule)
    const ghost = {
      title: ev.title + " (moved +"+minutes+"m)",
      start_at: newStart, end_at: newEnd, source: "ai-draft", is_draft: true
    };
    const { data, error: insErr } = await supabase.from("events").insert(ghost).select("id").single();
    if (insErr) throw new Error("ghost_insert_failed");
    return { applied: false, draft_event_id: data.id, newStart, newEnd };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get("Authorization");
    const jwt = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!jwt) return new Response(JSON.stringify({ error: "no_auth" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    const supabase = createClient(SUPABASE_URL, ANON_KEY, { 
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr || !user) return new Response(JSON.stringify({ error: "bad_user" }), { 
      status: 401, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

    const body = await req.json() as ReqBase;
    
    console.log(`[orchestrator] user=${user.id} intent=${body.intent}`);

    return new Response(JSON.stringify({ 
      message: "AI orchestrator placeholder - Epic 8 implementation in progress",
      intent: body.intent,
      user_id: user.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("[orchestrator] error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
