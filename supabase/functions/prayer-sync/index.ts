import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(d: unknown, status = 200) {
  return new Response(JSON.stringify(d), { 
    status, 
    headers: { "content-type": "application/json; charset=utf-8", ...cors }
  });
}

function todayDubaiISO() {
  const now = new Date();
  // تحويل UTC إلى دبي (+4)
  const dubai = new Date(now.getTime() + (4 * 60 * 60 * 1000));
  return dubai.toISOString().slice(0, 10);
}

async function fetchOneDay(lat: number, lon: number, method: string, dateISO: string) {
  const url = `https://api.aladhan.com/v1/timings/${dateISO}?latitude=${lat}&longitude=${lon}&method=${encodeURIComponent(method)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed (${r.status})`);
  const j = await r.json();
  const t = j?.data?.timings || {};
  
  // Normalize to HH:MM (remove suffix like "(+04)")
  const clean = (s: string) => String(s || "").split(" ")[0].trim();
  
  return {
    fajr: clean(t.Fajr),
    dhuhr: clean(t.Dhuhr),
    asr: clean(t.Asr),
    maghrib: clean(t.Maghrib),
    isha: clean(t.Isha)
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...cors } });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({}));
    const baseDate = typeof body.date === "string" ? body.date : todayDubaiISO();
    const days = Number(body.days ?? 1) || 1;

    // read location/method from profile if not provided
    let lat = body.lat, lon = body.lon, method = body.method;
    
    if (lat == null || lon == null || method == null) {
      const { data: prof } = await supabase.from("profiles")
        .select("latitude,longitude,prayer_method")
        .eq("id", user.id).maybeSingle();
      
      if (lat == null) lat = prof?.latitude ?? 25.2048;     // دبي افتراضيًا
      if (lon == null) lon = prof?.longitude ?? 55.2708;
      if (method == null) method = prof?.prayer_method ?? "MWL";
    }

    const toDate = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(+d)) return new Date(baseDate);
      return d;
    };
    
    const start = toDate(baseDate);
    const results: Array<{ date_iso: string }> = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateISO = d.toISOString().slice(0, 10);
      
      const times = await fetchOneDay(Number(lat), Number(lon), String(method), dateISO);
      
      console.log(`📅 Fetched prayer times for ${dateISO}:`, times);

      const { error } = await supabase.from("prayer_times").upsert({
        owner_id: user.id,
        date_iso: dateISO,
        fajr: times.fajr,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha,
        method: String(method),
        source: "aladhan"
      }, { onConflict: "owner_id,date_iso" });
      
      if (error) {
        console.error(`❌ DB error for ${dateISO}:`, error);
      } else {
        console.log(`✅ Saved prayer times for ${dateISO}`);
      }
      
      if (error) throw error;
      results.push({ date_iso: dateISO });
    }

    console.log(`Prayer sync completed for user ${user.id}: ${results.length} days`);
    return json({ ok: true, saved: results.length, lat, lon, method });
    
  } catch (e) {
    console.error("prayer-sync error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
