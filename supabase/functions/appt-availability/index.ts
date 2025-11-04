import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Input = {
  slug: string;
  date: string;
  duration: number;
  step?: number;
  limit?: number;
};

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Public endpoint - no auth required for viewing availability

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { slug, date, duration, step = 30, limit = 20 }: Input = await req.json().catch(() => ({}));
  if (!slug || !date || !duration) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: slug, date, duration", code: "MISSING_FIELDS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: page, error: pageErr } = await sb
    .from("appointment_pages")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (pageErr || !page) {
    return new Response(
      JSON.stringify({ error: "Appointment page not found", code: "PAGE_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const stepMinutes = Math.max(5, step);
  const dur = Math.max(15, duration);
  const maxSlots = Math.min(48, limit);

  const dayStart = Date.parse(`${date}T${page.window.start}:00`);
  const dayEnd = Date.parse(`${date}T${page.window.end}:00`);

  const { data: busyEvts } = await sb
    .from("events")
    .select("starts_at,ends_at,busy_state,kind,owner_id")
    .gte("starts_at", new Date(dayStart - 24 * 3600e3).toISOString())
    .lte("ends_at", new Date(dayEnd + 24 * 3600e3).toISOString())
    .eq("owner_id", page.user_id);

  const busy: Array<[number, number]> = [];
  (busyEvts ?? []).forEach((e) => {
    if ((e.busy_state ?? "busy") === "free") return;
    const s = Date.parse(e.starts_at);
    const en = Date.parse(e.ends_at);
    if (overlaps(s, en, dayStart, dayEnd)) {
      busy.push([Math.max(s, dayStart), Math.min(en, dayEnd)]);
    }
  });

  const { data: prayers } = await sb
    .from("prayer_times")
    .select("date_iso,fajr,dhuhr,asr,maghrib,isha")
    .eq("owner_id", page.user_id)
    .eq("date_iso", date)
    .maybeSingle();

  if (prayers) {
    ["fajr", "dhuhr", "asr", "maghrib", "isha"].forEach((k) => {
      const t = (prayers as any)[k];
      if (!t) return;
      const ts = Date.parse(`${date}T${t}`);
      busy.push([ts - 5 * 60e3, ts + 20 * 60e3]);
    });
  }

  const { data: bookings } = await sb
    .from("appointment_bookings")
    .select("start_at,end_at")
    .eq("page_id", page.id)
    .gte("start_at", new Date(dayStart).toISOString())
    .lte("end_at", new Date(dayEnd).toISOString());

  (bookings ?? []).forEach((b) => {
    const s = Date.parse(b.start_at) - ((page.buffer?.before ?? 10) * 60e3);
    const en = Date.parse(b.end_at) + ((page.buffer?.after ?? 10) * 60e3);
    busy.push([s, en]);
  });

  const slots: string[] = [];
  for (let ts = dayStart; ts + dur * 60e3 <= dayEnd; ts += stepMinutes * 60e3) {
    const slotEnd = ts + dur * 60e3;
    const sWithBuf = ts - ((page.buffer?.before ?? 10) * 60e3);
    const eWithBuf = slotEnd + ((page.buffer?.after ?? 10) * 60e3);
    const collide = busy.some(([b1, b2]) => overlaps(sWithBuf, eWithBuf, b1, b2));
    if (!collide) slots.push(new Date(ts).toISOString());
    if (slots.length >= maxSlots) break;
  }

  const capped = slots.slice(0, page.max_per_day ?? 8);
  return new Response(JSON.stringify({ slots: capped, duration: dur, tz: page.tz }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
