import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  duration_min?: number;
  title?: string;
  window?: { start?: string; end?: string };
};

function iso(d: Date) {
  return d.toISOString();
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

    const now = new Date();
    const body = (await req.json().catch(() => ({}))) as Body;
    const duration = Math.max(25, Math.min(240, body.duration_min ?? 120)); // 25-240 minutes
    const title = (body.title ?? "[AI] Focus Sprint").slice(0, 180);
    const winStart = body.window?.start ? new Date(body.window.start) : now;
    const winEnd = body.window?.end ? new Date(body.window.end) : new Date(now.getTime() + 4 * 3600_000);

    console.log('[plan-focus-now] Planning focus session:', {
      user_id: user.id,
      duration,
      window: { start: iso(winStart), end: iso(winEnd) }
    });

    // 1) Try to suggest time via AI (avoids prayers + events)
    let startISO: string | null = null;
    let endISO: string | null = null;

    try {
      const aiReq = {
        intent: "calendar_suggest",
        duration_min: duration,
        window: { start: iso(winStart), end: iso(winEnd) },
        prefs: {}
      };

      const aiRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-orchestrator`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
        body: JSON.stringify(aiReq)
      });

      if (aiRes.ok) {
        const aij = await aiRes.json();
        const sug = (aij?.suggestions ?? []).find((s: any) => new Date(s.start) >= now);
        if (sug) {
          startISO = sug.start;
          endISO = sug.end;
          console.log('[plan-focus-now] AI suggested slot:', { start: startISO, end: endISO });
        }
      }
    } catch (e) {
      console.warn('[plan-focus-now] AI suggestion failed, using fallback:', e);
    }

    // 2) Simple local fallback if AI fails
    if (!startISO || !endISO) {
      // Fetch busy events within 6 hour window
      const qStart = iso(now);
      const qEnd = iso(new Date(now.getTime() + 6 * 3600_000));
      const { data: evs } = await sb.from("events")
        .select("starts_at,ends_at,busy_state,kind")
        .eq("owner_id", user.id)
        .gte("ends_at", qStart)
        .lte("starts_at", qEnd);

      // Fetch today's prayer times
      const today = iso(now).slice(0, 10);
      const { data: pt } = await sb.from("prayer_times")
        .select("*")
        .eq("owner_id", user.id)
        .eq("date_iso", today)
        .maybeSingle();

      const blocks: [number, number][] = [];

      // Busy events
      for (const e of (evs || [])) {
        if (e.busy_state === "free" || e.kind === "prayer") continue;
        blocks.push([Date.parse(e.starts_at), Date.parse(e.ends_at)]);
      }

      // Prayer windows (from -5 to +20 minutes)
      if (pt) {
        for (const k of ["fajr", "dhuhr", "asr", "maghrib", "isha"]) {
          const t = (pt as any)[k];
          if (!t) continue;
          const at = Date.parse(`${today}T${t}`);
          blocks.push([at - 5 * 60_000, at + 20 * 60_000]);
        }
      }

      // Merge overlapping blocks
      blocks.sort((a, b) => a[0] - b[0]);
      const merged: [number, number][] = [];
      for (const [s, e] of blocks) {
        if (!merged.length || s > merged[merged.length - 1][1]) {
          merged.push([s, e]);
        } else {
          merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
        }
      }

      // Find first slot >= duration
      let cur = now.getTime();
      const endWin = winEnd.getTime();
      for (const [s, e] of merged) {
        if (cur + duration * 60_000 <= s) {
          // Found a slot
          startISO = new Date(cur).toISOString();
          endISO = new Date(cur + duration * 60_000).toISOString();
          break;
        }
        cur = Math.max(cur, e + 5 * 60_000);
        if (cur + duration * 60_000 > endWin) break;
      }

      if (!startISO && cur + duration * 60_000 <= endWin) {
        startISO = new Date(cur).toISOString();
        endISO = new Date(cur + duration * 60_000).toISOString();
      }

      console.log('[plan-focus-now] Fallback slot found:', { start: startISO, end: endISO });
    }

    if (!startISO || !endISO) {
      console.log('[plan-focus-now] No available slot found');
      return new Response(
        JSON.stringify({ ok: false, reason: "no_slot_found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // 3) Insert event as local draft (busy)
    const draft = {
      owner_id: user.id,
      title,
      description: "Auto-planned focus sprint",
      starts_at: startISO,
      ends_at: endISO,
      timezone: "UTC",
      kind: "focus",
      busy_state: "busy",
      source: "ai",
      external_source: "local",
      status: "confirmed"
    };

    const { data: ins, error } = await sb.from("events").insert(draft).select("id").single();
    if (error) {
      console.error('[plan-focus-now] Insert error:', error);
      return new Response(error.message, { status: 400, headers: corsHeaders });
    }

    console.log('[plan-focus-now] Event created:', ins?.id);

    // 4) Enable focus mode
    await sb.from("user_focus_state").upsert({
      user_id: user.id,
      active: true,
      updated_at: iso(new Date())
    });

    console.log('[plan-focus-now] Focus mode enabled');

    // 5) Optionally trigger conflict-check for today
    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/conflict-check`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ date: startISO.slice(0, 10) })
    }).catch(() => { });

    return new Response(
      JSON.stringify({
        ok: true,
        event_id: ins?.id,
        start_at: startISO,
        end_at: endISO,
        focus: true
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[plan-focus-now] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
