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

type PrayerTimes = {
  fajr: string | null;
  dhuhr: string | null;
  asr: string | null;
  maghrib: string | null;
  isha: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const sb = createClient(url, anon, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { probe_event, date_from, date_to, days_range } = body;
    
    // Support range mode: check today ±days_range
    let startDate: string;
    let endDate: string;
    
    if (days_range !== undefined) {
      const range = Math.max(0, Math.min(30, Number(days_range)));
      const start = new Date();
      start.setDate(start.getDate() - range);
      const end = new Date();
      end.setDate(end.getDate() + range);
      startDate = start.toISOString().slice(0, 10);
      endDate = end.toISOString().slice(0, 10);
    } else {
      const day = date_from || (typeof body.date === "string" ? body.date : new Date().toISOString().slice(0, 10));
      startDate = day;
      endDate = date_to || day;
    }

    // Fetch prayer times for date range
    const { data: prayerData } = await sb
      .from("prayer_times")
      .select("date_iso,fajr,dhuhr,asr,maghrib,isha")
      .eq("owner_id", user.id)
      .gte("date_iso", startDate)
      .lte("date_iso", endDate)
      .order("date_iso");
    
    if (!prayerData || prayerData.length === 0) {
      return json({ ok: true, conflicts: 0, note: "NO_PRAYER_RECORDS" });
    }

    // Gather events to check
    const list: Array<{ id: string; starts_at: string; ends_at: string; title: string }> = [];
    
    if (probe_event) {
      list.push({
        id: probe_event.id || "probe",
        title: probe_event.title || "(Event)",
        starts_at: probe_event.starts_at,
        ends_at: probe_event.ends_at
      });
    } else {
      const { data: evs } = await sb
        .from("events")
        .select("id,title,starts_at,ends_at")
        .eq("owner_id", user.id)
        .gte("starts_at", `${startDate}T00:00:00`)
        .lte("starts_at", `${endDate}T23:59:59`)
        .order("starts_at");
      
      list.push(...((evs ?? []) as typeof list));
    }

    // Build prayer time windows (±10 minutes)
    function toDate(day: string, hhmm: string) {
      const [h, m] = hhmm.split(":").map(n => parseInt(n, 10));
      const d = new Date(`${day}T00:00:00`);
      d.setHours(h || 0, m || 0, 0, 0);
      return d;
    }

    const bufferMs = 10 * 60 * 1000; // 10 minutes
    let inserted = 0;
    const conflicts: any[] = [];
    const suggestions: any[] = [];
    
    // Process each day
    for (const dayData of prayerData) {
      const day = dayData.date_iso;
      const t = dayData as PrayerTimes & { date_iso: string };
      
      const prayers: [string, string][] = [
        ["fajr", t.fajr],
        ["dhuhr", t.dhuhr],
        ["asr", t.asr],
        ["maghrib", t.maghrib],
        ["isha", t.isha],
      ].filter((x): x is [string, string] => !!x[1]);

      // Get events for this day
      const dayEvents = list.filter(e => {
        const eventDay = e.starts_at.slice(0, 10);
        return eventDay === day;
      });

      for (const [prayerName, hhmm] of prayers) {
        const center = toDate(day, hhmm);
        const from = new Date(center.getTime() - bufferMs);
        const to = new Date(center.getTime() + bufferMs);

        for (const e of dayEvents) {
          const es = new Date(e.starts_at).getTime();
          const ee = new Date(e.ends_at).getTime();
          const overlap = es <= to.getTime() && ee >= from.getTime();
          
          if (!overlap) continue;

          // Check if conflict already exists
          const { data: existing } = await sb
            .from("conflicts")
            .select("id")
            .eq("owner_id", user.id)
            .eq("date_iso", day)
            .eq("prayer_name", prayerName)
            .eq("object_id", e.id)
            .maybeSingle();

          if (existing) continue; // Already recorded

          const overlapMin = Math.round(
            (Math.min(ee, to.getTime()) - Math.max(es, from.getTime())) / 60000
          );

          // Create conflict record
          conflicts.push({
            event_id: e.id,
            event_title: e.title,
            event_start: e.starts_at,
            event_end: e.ends_at,
            prayer_name: prayerName,
            prayer_date: day,
            window_from: from.toISOString(),
            window_to: to.toISOString()
          });

          // Create suggestion
          const duration = ee - es;
          const sugFrom = new Date(Math.max(to.getTime(), es));
          const sugTo = new Date(sugFrom.getTime() + duration);
          
          suggestions.push({
            event_id: e.id,
            move_to: { from: sugFrom.toISOString(), to: sugTo.toISOString() },
            message: `يتعارض مع ${prayerName}. اقترح نقله بعد نافذة الصلاة.`
          });

          const ins = await sb
            .from("conflicts")
            .insert({
              owner_id: user.id,
              date_iso: day,
              prayer_name: prayerName,
              prayer_start: from.toISOString(),
              prayer_end: to.toISOString(),
              object_kind: "event",
              object_id: e.id === "probe" ? null : e.id,
              overlap_min: overlapMin,
              status: "open",
              severity: overlapMin > 5 ? "hard" : "soft"
            })
            .select("id")
            .single();

          if (!ins.error) inserted++;
        }
      }
    }

    console.log(`Conflict check for ${startDate} to ${endDate}: ${inserted} new conflicts found`);

    return json({ 
      ok: true, 
      conflicts, 
      suggestions, 
      inserted, 
      date_from: startDate,
      date_to: endDate
    });
  } catch (e: any) {
    console.error("conflict-check error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
