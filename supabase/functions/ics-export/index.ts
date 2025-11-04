import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function esc(s: string) {
  return (s || "").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
}

function fmt(dt: string) {
  // UTC → 20251104T093000Z
  const d = new Date(dt);
  const pad = (n:number)=> String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ","");
    if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

    const body = await req.json().catch(()=> ({}));
    const start = body.start ?? new Date(Date.now()-7*24*3600e3).toISOString();
    const end   = body.end   ?? new Date(Date.now()+30*24*3600e3).toISOString();

    const { data: rows, error } = await sb
      .from("events")
      .select("id,title,description,location,starts_at,ends_at,timezone,provider,external_id")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .gte("starts_at", start)
      .lte("ends_at", end)
      .order("starts_at", { ascending: true });

    if (error) return new Response(error.message, { status: 400, headers: corsHeaders });

    const now = fmt(new Date().toISOString());
    let ics = [
      "BEGIN:VCALENDAR",
      "PRODID:-//Oryxa//Calendar//EN",
      "VERSION:2.0",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    for (const r of rows ?? []) {
      const uid = r.external_id || `oryxa-${r.id}@local`;
      ics.push(
        "BEGIN:VEVENT",
        `UID:${esc(uid)}`,
        `DTSTAMP:${now}`,
        `DTSTART:${fmt(r.starts_at)}`,
        `DTEND:${fmt(r.ends_at)}`,
        `SUMMARY:${esc(r.title || "")}`,
        r.description ? `DESCRIPTION:${esc(r.description)}` : "",
        r.location ? `LOCATION:${esc(r.location)}` : "",
        "END:VEVENT"
      );
    }

    ics.push("END:VCALENDAR");
    const text = ics.filter(Boolean).join("\r\n");

    return new Response(text, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="oryxa-${new Date().toISOString().slice(0,10)}.ics"`
      }
    });
  } catch (e) {
    console.error("ics-export error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
