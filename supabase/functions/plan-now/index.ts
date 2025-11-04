import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlanBlock = {
  title: string;
  start: string;
  end: string;
  kind?: string;
  busy_state?: "busy" | "free";
  notes?: string;
};

type Body = {
  window?: { start?: string; end?: string };
  prefs?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  dry_run?: boolean;
  title_prefix?: string;
};

function isoEndOfDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 0);
  return x.toISOString();
}

function coerceISO(v?: string, fallback?: string) {
  try {
    if (v) return new Date(v).toISOString();
  } catch {}
  return fallback ?? new Date().toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

    const body = (await req.json().catch(() => ({}))) as Body;
    const start = coerceISO(body.window?.start, new Date().toISOString());
    const end = coerceISO(body.window?.end, isoEndOfDay(new Date()));
    const titlePrefix = (body.title_prefix ?? "[AI] ") as string;

    console.log('[plan-now] Planning window:', { start, end, user_id: user.id });

    // Call AI orchestrator to generate plan
    const aiReq = {
      intent: "plan_my_day",
      preferences: { religion: "muslim", ...(body.prefs || {}) },
      constraints: { avoid_during_prayers: true, ...(body.constraints || {}) },
      calendar_window: { start, end }
    };

    const aiRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-orchestrator`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify(aiReq)
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error('[plan-now] AI orchestrator failed:', t);
      return new Response(
        JSON.stringify({ error: `ai_orchestrator_failed: ${t}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiJson = await aiRes.json();

    // Extract blocks from various possible schemas
    const blocks: PlanBlock[] =
      aiJson?.plan?.blocks ??
      aiJson?.blocks ??
      aiJson?.suggestions ??
      [];

    // Normalize fields
    const normalized: PlanBlock[] = blocks
      .map((b: any) => ({
        title: String(b.title ?? b.summary ?? "Planned Block"),
        start: coerceISO(b.start ?? b.start_at),
        end: coerceISO(b.end ?? b.end_at),
        kind: (b.kind ?? "focus"),
        busy_state: (b.busy_state ?? "busy"),
        notes: b.notes
      }))
      .filter(b => !!b.start && !!b.end);

    console.log('[plan-now] Generated blocks:', normalized.length);

    if (body.dry_run) {
      return new Response(
        JSON.stringify({ ok: true, dry_run: true, window: { start, end }, blocks: normalized }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert drafts locally - no push to Google
    // Avoid duplicates: skip blocks that overlap with existing busy events
    let inserted = 0, skipped = 0;
    for (const b of normalized) {
      // Check for simple overlap
      const { data: overlap } = await sb
        .from("events")
        .select("id,starts_at,ends_at,busy_state")
        .eq("owner_id", user.id)
        .neq("busy_state", "free")
        .lte("starts_at", b.end)
        .gte("ends_at", b.start)
        .limit(1);

      if ((overlap?.length ?? 0) > 0) {
        console.log('[plan-now] Skipping overlapping block:', b.title);
        skipped++;
        continue;
      }

      const draft = {
        owner_id: user.id,
        title: `${titlePrefix}${b.title}`.slice(0, 180),
        description: b.notes ?? null,
        starts_at: b.start,
        ends_at: b.end,
        timezone: "UTC",
        kind: b.kind || "focus",
        busy_state: b.busy_state || "busy",
        source: "ai",
        external_source: "local",
        status: "confirmed"
      };

      const { error } = await sb.from("events").insert(draft);
      if (error) {
        console.error('[plan-now] Insert error:', error);
        skipped++;
        continue;
      }
      inserted++;
    }

    console.log('[plan-now] Results:', { inserted, skipped, total: normalized.length });

    // Optionally trigger conflict-check for today
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/conflict-check`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ date: start.slice(0, 10) })
    }).catch(() => { });

    return new Response(
      JSON.stringify({
        ok: true,
        window: { start, end },
        inserted,
        skipped,
        total: normalized.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[plan-now] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
