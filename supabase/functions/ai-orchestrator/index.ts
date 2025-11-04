// Epic 8: AI Executive Layer - Orchestrator
// OpenAI-only | JSON Schema | Draft-first
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Intent = "plan_my_day" | "resolve_conflicts" | "daily_briefing" | "budget_guard" | "what_if" | "calendar_suggest";
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
    const { intent, apply = false, calendar_window, input, preferences, constraints, ghost = true } = body;
    
    console.log(`[orchestrator] user=${user.id} intent=${intent}`);

    // Handle different intents
    let result: any = { intent, user_id: user.id };

    switch (intent) {
      case "daily_briefing": {
        const schema = {
          type: "object",
          properties: {
            bullets: { type: "array", items: { type: "string" } }
          },
          required: ["bullets"]
        };
        
        const brief = await openaiJSON(
          "You are a daily briefing assistant. Provide 5 concise, actionable bullet points.",
          { user_id: user.id, date: new Date().toISOString() },
          "briefing",
          schema
        );
        
        result.bullets = brief?.bullets || ["No briefing available"];
        break;
      }

      case "plan_my_day": {
        if (!calendar_window) return bad("calendar_window required");
        
        const ctx = await fetchContext(supabase, user.id, calendar_window);
        const schema = {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  start: { type: "string" },
                  end: { type: "string" },
                  kind: { type: "string" }
                },
                required: ["title", "start", "end", "kind"]
              }
            }
          },
          required: ["events"]
        };

        const plan = await openaiJSON(
          "You are a daily planner. Create a balanced schedule respecting prayer times and existing events.",
          { context: ctx, preferences, constraints },
          "daily_plan",
          schema
        );

        const events = plan?.events || [];
        
        if (!apply || ghost) {
          // Create draft events
          for (const ev of events) {
            await supabase.from("events").insert({
              owner_id: user.id,
              title: ev.title,
              starts_at: ev.start,
              ends_at: ev.end,
              source: "ai-draft",
              is_draft: true
            });
          }
          result.events = events;
          result.status = "draft_created";
        } else {
          // Apply directly
          for (const ev of events) {
            await supabase.from("events").insert({
              owner_id: user.id,
              title: ev.title,
              starts_at: ev.start,
              ends_at: ev.end,
              source: "ai",
              is_ai_created: true
            });
          }
          result.events = events;
          result.status = "applied";
        }
        break;
      }

      case "resolve_conflicts": {
        if (!input?.conflict_id) return bad("conflict_id required");
        
        const { data: conflict } = await supabase
          .from("conflicts")
          .select("*")
          .eq("id", input.conflict_id)
          .single();
        
        if (!conflict) return bad("conflict_not_found", 404);

        const schema = {
          type: "object",
          properties: {
            action: { type: "string" },
            shift_minutes: { type: "number" }
          },
          required: ["action"]
        };

        const resolution = await openaiJSON(
          "Suggest how to resolve this scheduling conflict.",
          { conflict, constraints },
          "resolution",
          schema
        );

        result.suggestion = resolution;
        
        if (apply && resolution?.shift_minutes && conflict.event_id) {
          const shifted = await shiftEventBy(
            supabase, 
            user.id, 
            conflict.event_id, 
            resolution.shift_minutes, 
            true
          );
          result.applied = shifted;
        }
        break;
      }

      case "budget_guard": {
        const threshold = input?.threshold || 0;
        const today = isoDateInTZ(new Date(), TZ_DEFAULT);
        
        const { data: metrics } = await supabase.rpc("get_daily_metrics", {
          p_user_id: user.id,
          p_start: today,
          p_end: today
        });

        const todayNet = metrics?.[0]?.net_cashflow || 0;
        const triggered = todayNet < threshold;

        result.triggered = triggered;
        result.current_balance = todayNet;
        result.threshold = threshold;
        break;
      }

      case "what_if": {
        if (!calendar_window) return bad("calendar_window required");
        
        const ctx = await fetchContext(supabase, user.id, calendar_window);
        const schema = {
          type: "object",
          properties: {
            scenarios: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  feasibility: { type: "string" }
                },
                required: ["description", "feasibility"]
              }
            }
          },
          required: ["scenarios"]
        };

        const whatIf = await openaiJSON(
          "Analyze hypothetical planning scenarios.",
          { context: ctx, preferences, constraints, input },
          "what_if",
          schema
        );

        result.scenarios = whatIf?.scenarios || [];
        break;
      }

      case "calendar_suggest": {
        // اقتراحات ذكية للمواعيد تحترم الصلاة والسفر والعمل
        if (!calendar_window) return bad("calendar_window required");
        if (!input?.duration_minutes) return bad("duration_minutes required");
        
        const ctx = await fetchContext(supabase, user.id, calendar_window);
        const { data: profile } = await supabase
          .from("profiles")
          .select("working_hours_start, working_hours_end, working_days, prayer_pre_buffer_min, prayer_post_buffer_min")
          .eq("id", user.id)
          .single();

        const schema = {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  start: { type: "string" },
                  end: { type: "string" },
                  score: { type: "number" },
                  reason: { type: "string" },
                  conflicts: { type: "array", items: { type: "string" } }
                },
                required: ["start", "end", "score", "reason", "conflicts"]
              }
            }
          },
          required: ["suggestions"]
        };

        const systemPrompt = `You are a smart calendar assistant. Suggest 3-5 time windows for a ${input.duration_minutes}-minute event.
- Respect prayer times with buffers (pre: ${profile?.prayer_pre_buffer_min || 10}m, post: ${profile?.prayer_post_buffer_min || 20}m)
- Respect working hours: ${profile?.working_hours_start || "09:00"} - ${profile?.working_hours_end || "17:00"}
- Avoid conflicts with existing events
- Consider travel time between locations if applicable
- Score each suggestion (0-100) based on feasibility and conflicts
Return suggestions in descending score order.`;

        const suggestions = await openaiJSON(
          systemPrompt,
          { 
            context: ctx, 
            duration_minutes: input.duration_minutes,
            preferences: input.preferences || {},
            title: input.title || "Untitled Event"
          },
          "calendar_suggest",
          schema
        );

        result.suggestions = suggestions?.suggestions || [];
        break;
      }

      default:
        return bad("unknown_intent");
    }

    return new Response(JSON.stringify(result), {
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
