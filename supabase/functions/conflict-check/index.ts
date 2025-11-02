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

type PT = { fajr?: string; dhuhr?: string; asr?: string; maghrib?: string; isha?: string };

const WINDOWS = {
  fajr:   { pre: -5,  post: 20 },
  dhuhr:  { pre: -10, post: 30 },
  asr:    { pre: -10, post: 30 },
  maghrib:{ pre: -10, post: 30 },
  isha:   { pre: -10, post: 30 },
} as const;

function hhmmToDate(hhmm: string, dateISO: string) {
  const [h, m] = hhmm.split(":").map(n => parseInt(n, 10));
  const d = new Date(dateISO + "T00:00:00.000Z");
  d.setUTCHours(h, m, 0, 0);
  return d;
}

function addMinutes(d: Date, mins: number) {
  const t = new Date(d);
  t.setMinutes(t.getMinutes() + mins);
  return t;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    
    const sb = createClient(supabaseUrl, supabaseAnon, { 
      global: { headers: { Authorization: auth } } 
    });
    
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({})) as {
      date?: string; from?: string; to?: string; event_id?: string;
    };

    // نطاق الأيام
    let dates: string[] = [];
    if (body.event_id) {
      const { data: ev, error: evErr } = await sb.from("events")
        .select("id, starts_at, ends_at")
        .eq("owner_id", user.id).eq("id", body.event_id).maybeSingle();
      if (evErr) throw evErr;
      if (!ev) return json({ ok: false, error: "EVENT_NOT_FOUND" }, 404);

      const s = new Date(ev.starts_at);
      const e = new Date(ev.ends_at ?? ev.starts_at);
      for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
    } else {
      const base = body.date ?? new Date().toISOString().slice(0, 10);
      const from = body.from ?? base;
      const to = body.to ?? base;
      const start = new Date(from);
      const end = new Date(to);
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        dates.push(d.toISOString().slice(0, 10));
      }
    }

    // اجلب الأحداث
    let events;
    if (body.event_id) {
      const { data, error } = await sb.from("events")
        .select("*").eq("owner_id", user.id).eq("id", body.event_id);
      if (error) throw error;
      events = data ?? [];
    } else {
      const fromISO = dates[0] + "T00:00:00.000Z";
      const toISO = dates[dates.length - 1] + "T23:59:59.999Z";
      const { data, error } = await sb.from("events")
        .select("*")
        .eq("owner_id", user.id)
        .lt("starts_at", toISO)
        .gt("ends_at", fromISO);
      if (error) throw error;
      events = data ?? [];
    }

    const results: Array<{ event_id: string; date_iso: string; overlaps: string[] }> = [];

    for (const day of dates) {
      const { data: pt } = await sb.from("prayer_times")
        .select("fajr,dhuhr,asr,maghrib,isha")
        .eq("owner_id", user.id)
        .eq("date_iso", day)
        .maybeSingle();

      const times = (pt ?? {}) as PT;
      const windows: Array<{ name: keyof PT; from: Date; to: Date }> = [];
      
      (["fajr", "dhuhr", "asr", "maghrib", "isha"] as const).forEach(name => {
        const t = times[name];
        if (!t) return;
        const base = hhmmToDate(t, day);
        const span = WINDOWS[name as keyof typeof WINDOWS];
        windows.push({ name, from: addMinutes(base, span.pre), to: addMinutes(base, span.post) });
      });

      if (!windows.length) continue;

      const todays = events.filter((ev: any) => {
        const s = new Date(ev.starts_at);
        const e = new Date(ev.ends_at ?? ev.starts_at);
        return e.toISOString().slice(0, 10) >= day && s.toISOString().slice(0, 10) <= day;
      });

      for (const ev of todays) {
        const s = new Date(ev.starts_at);
        const e = new Date(ev.ends_at ?? ev.starts_at);
        const overlaps: string[] = [];
        
        for (const w of windows) {
          if (e > w.from && s < w.to) overlaps.push(String(w.name));
        }

        if (overlaps.length) {
          results.push({ event_id: ev.id, date_iso: day, overlaps });
          for (const name of overlaps) {
            await sb.from("conflicts").upsert({
              owner_id: user.id,
              event_id: ev.id,
              date_iso: day,
              prayer_name: name,
              status: "open",
              created_at: new Date().toISOString(),
            }, { onConflict: "owner_id,event_id,prayer_name,date_iso" });
          }
        } else {
          await sb.from("conflicts")
            .update({ status: "resolved" })
            .eq("owner_id", user.id)
            .eq("event_id", ev.id)
            .eq("date_iso", day)
            .eq("status", "open");
        }
      }
    }

    console.log(`Conflict check completed for user ${user.id}: ${results.length} conflicts found`);
    return json({ ok: true, results });
  } catch (e: any) {
    console.error("conflict-check error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
