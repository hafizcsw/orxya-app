// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" }
  });
}

type RequestBody = {
  from?: string; // ISO date or datetime
  to?: string;   // ISO date or datetime
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function clampDateOnly(s?: string): Date | null {
  if (!s) return null;
  const t = new Date(s);
  return Number.isNaN(+t) ? null : t;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }

    const body = await req.json().catch(() => ({})) as RequestBody;
    const now = new Date();
    const from = clampDateOnly(body.from) ?? new Date(toISODate(now));
    const to = clampDateOnly(body.to) ?? new Date(+from + 24 * 60 * 60 * 1000); // +24 hours

    // Get prayer buffer settings from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("prayer_prebuffer_min, prayer_postbuffer_min")
      .eq("id", user.id)
      .maybeSingle();

    const preBuf = Math.max(0, Number(profile?.prayer_prebuffer_min ?? 5));
    const postBuf = Math.max(0, Number(profile?.prayer_postbuffer_min ?? 15));

    // Generate date range
    const dates: string[] = [];
    const d0 = new Date(toISODate(from));
    while (+d0 < +to) {
      dates.push(toISODate(d0));
      d0.setDate(d0.getDate() + 1);
    }

    // Fetch prayer times for the date range
    const { data: prayers } = await supabase
      .from("prayer_times")
      .select("date_iso, fajr, dhuhr, asr, maghrib, isha")
      .eq("owner_id", user.id)
      .in("date_iso", dates);

    // Build prayer windows with buffers
    type PrayerWindow = {
      label: string;
      start: number;
      end: number;
      date: string;
      time: string;
    };

    const prayerWindows: PrayerWindow[] = [];
    for (const p of prayers ?? []) {
      const addWindow = (label: string, timeStr?: string | null) => {
        if (!timeStr) return;
        
        // Parse HH:MM to timestamp
        const [h, m] = timeStr.split(':').map(Number);
        const prayerTime = new Date(p.date_iso + 'T00:00:00.000Z');
        prayerTime.setUTCHours(h, m, 0, 0);
        
        const start = +prayerTime - preBuf * 60 * 1000;
        const end = +prayerTime + postBuf * 60 * 1000;
        
        prayerWindows.push({
          label,
          start,
          end,
          date: p.date_iso,
          time: timeStr
        });
      };

      addWindow("الفجر", p.fajr);
      addWindow("الظهر", p.dhuhr);
      addWindow("العصر", p.asr);
      addWindow("المغرب", p.maghrib);
      addWindow("العشاء", p.isha);
    }

    // Fetch events in the time range
    const { data: events } = await supabase
      .from("events")
      .select("id, title, starts_at, ends_at")
      .eq("owner_id", user.id)
      .gte("starts_at", from.toISOString())
      .lte("starts_at", to.toISOString());

    let created = 0;
    let updated = 0;

    // Check each event against prayer windows
    for (const event of events ?? []) {
      const eventStart = +new Date(event.starts_at);
      const eventEnd = +new Date(event.ends_at ?? event.starts_at);

      for (const window of prayerWindows) {
        if (overlaps(eventStart, eventEnd, window.start, window.end)) {
          // Calculate overlap duration
          const overlapStart = Math.max(eventStart, window.start);
          const overlapEnd = Math.min(eventEnd, window.end);
          const overlapMin = Math.round((overlapEnd - overlapStart) / 60000);

          const conflictData = {
            owner_id: user.id,
            event_id: event.id,
            object_kind: 'event',
            object_id: event.id,
            prayer_name: window.label,
            prayer_start: new Date(window.start).toISOString(),
            prayer_end: new Date(window.end).toISOString(),
            date_iso: window.date,
            overlap_min: overlapMin,
            severity: 'hard',
            status: 'open',
            buffer_min: preBuf + postBuf,
          };

          // Check if conflict already exists
          const { data: existing } = await supabase
            .from("conflicts")
            .select("id")
            .eq("owner_id", user.id)
            .eq("event_id", event.id)
            .eq("prayer_name", window.label)
            .eq("date_iso", window.date)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from("conflicts")
              .update({
                ...conflictData,
                updated_at: new Date().toISOString()
              })
              .eq("id", existing.id);
            
            if (error) throw error;
            updated++;
          } else {
            const { error } = await supabase
              .from("conflicts")
              .insert(conflictData);
            
            if (error) throw error;
            created++;
          }
        }
      }
    }

    console.log(`Conflict check for user ${user.id}: ${created} created, ${updated} updated`);

    return json({ ok: true, created, updated });
  } catch (e: any) {
    console.error("conflict-check error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
