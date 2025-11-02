import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTH" }), {
        status: 401, headers: { ...cors, "content-type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const dateISO = body.date ?? new Date().toISOString().slice(0, 10);

    const { data: pt } = await supabase.from("prayer_times")
      .select("fajr,dhuhr,asr,maghrib,isha")
      .eq("owner_id", user.id).eq("date_iso", dateISO).maybeSingle();

    if (!pt) return new Response(JSON.stringify({ ok: true, conflicts: [] }), { headers: cors });

    const dayStart = new Date(`${dateISO}T00:00:00Z`);
    const dayEnd = new Date(`${dateISO}T23:59:59Z`);

    // استعلام موسّع للتداخل عبر منتصف الليل
    const { data: events } = await supabase.from("events")
      .select("id,title,starts_at,ends_at,status")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .or(`and(starts_at.gte.${dayStart.toISOString()},starts_at.lte.${dayEnd.toISOString()}),and(ends_at.gte.${dayStart.toISOString()},ends_at.lte.${dayEnd.toISOString()})`);

    const slots = [
      { name: "الفجر", time: pt.fajr, window: 35 },
      { name: "الظهر", time: pt.dhuhr, window: 40 },
      { name: "العصر", time: pt.asr, window: 40 },
      { name: "المغرب", time: pt.maghrib, window: 30 },
      { name: "العشاء", time: pt.isha, window: 35 },
    ].map(s => {
      const start = new Date(`${dateISO}T${s.time}:00Z`);
      const end = new Date(start.getTime() + s.window * 60 * 1000);
      return { ...s, start, end };
    });

    const conflictsToUpsert: any[] = [];

    for (const ev of (events ?? [])) {
      const evStart = new Date(ev.starts_at);
      const evEnd = new Date(ev.ends_at ?? ev.starts_at);

      for (const s of slots) {
        if (evStart < s.end && s.start < evEnd) {
          const overlapMin = Math.floor(
            (Math.min(evEnd.getTime(), s.end.getTime()) - 
             Math.max(evStart.getTime(), s.start.getTime())) / 60000
          );

          conflictsToUpsert.push({
            owner_id: user.id, event_id: ev.id, conflict_date: dateISO,
            slot_name: s.name, severity: ev.status === 'confirmed' ? 'warn' : 'block',
            status: 'open', overlap_min: overlapMin, prayer_name: s.name,
            prayer_start: s.start.toISOString(), prayer_end: s.end.toISOString(),
            object_kind: 'event', object_id: ev.id, date_iso: dateISO
          });
        }
      }
    }

    if (conflictsToUpsert.length > 0) {
      await supabase.from("conflicts").upsert(conflictsToUpsert, {
        onConflict: 'owner_id,event_id,conflict_date,slot_name',
        ignoreDuplicates: false
      });
    }

    return new Response(JSON.stringify({ ok: true, count: conflictsToUpsert.length }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
