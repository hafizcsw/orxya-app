import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function unfold(lines: string[]) {
  const out: string[] = [];
  for (const line of lines) {
    if (line.startsWith(" ") || line.startsWith("\t")) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseICS(ics: string) {
  const lines = unfold(ics.replace(/\r\n/g,"\n").split("\n"));
  const events: any[] = [];
  let cur: any = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { cur = {}; continue; }
    if (line === "END:VEVENT")   { if (cur) events.push(cur); cur = null; continue; }
    if (!cur) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const keyRaw = line.slice(0, idx);
    const val = line.slice(idx+1);

    const key = keyRaw.split(";")[0].toUpperCase();
    switch(key){
      case "UID": cur.uid = val; break;
      case "SUMMARY": cur.summary = val.replace(/\\n/g,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\"); break;
      case "DESCRIPTION": cur.description = val.replace(/\\n/g,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\"); break;
      case "LOCATION": cur.location = val.replace(/\\n/g,"\n").replace(/\\,/g,",").replace(/\\;/g,";").replace(/\\\\/g,"\\"); break;
      case "DTSTART": cur.dtstart = val; break;
      case "DTEND": cur.dtend = val; break;
      case "RRULE": cur.rrule = val; break;
    }
  }
  return events;
}

function toISO(v: string) {
  if (!v) return null;
  if (v.endsWith("Z")) {
    const s = v.replace(/Z$/,"");
    const y = s.slice(0,4), m = s.slice(4,6), d = s.slice(6,8), H = s.slice(9,11), M = s.slice(11,13), S = s.slice(13,15);
    return `${y}-${m}-${d}T${H}:${M}:${S}Z`;
  }
  if (v.length === 8) {
    const y = v.slice(0,4), m = v.slice(4,6), d = v.slice(6,8);
    return `${y}-${m}-${d}T00:00:00Z`;
  }
  return new Date(v).toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ","");
    if (!jwt) return new Response("no_auth",{ status:401, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global:{ headers:{ Authorization:`Bearer ${jwt}` } }
    });

    const { data:{ user } } = await sb.auth.getUser();
    if (!user) return new Response("bad_user",{ status:401, headers: corsHeaders });

    const body = await req.json().catch(()=> ({}));
    let icsText: string | null = body.ics ?? null;

    if (!icsText && body.url) {
      const res = await fetch(body.url);
      if (!res.ok) return new Response("fetch_failed",{ status:400, headers: corsHeaders });
      icsText = await res.text();
    }
    if (!icsText) return new Response("no_ics",{ status:400, headers: corsHeaders });

    const items = parseICS(icsText);
    let upserted = 0;

    for (const it of items) {
      const start = toISO(it.dtstart);
      const end   = toISO(it.dtend) || (start ? new Date(Date.parse(start)+60*60*1000).toISOString() : null);
      if (!start || !end) continue;

      const ev = {
        owner_id: user.id,
        title: it.summary || "(No title)",
        description: it.description ?? null,
        location: it.location ?? null,
        starts_at: start,
        ends_at: end,
        timezone: "UTC",
        visibility: "default",
        busy_state: "busy",
        provider: "ics",
        source: "external",
        external_id: it.uid || crypto.randomUUID(),
        recurrence: it.rrule ? { rrule: it.rrule } : null,
        kind: "meeting"
      };

      const { error } = await sb.from("events").upsert(ev, { onConflict: "provider,external_id" });
      if (!error) upserted++;
    }

    return new Response(JSON.stringify({ ok:true, upserted }), { 
      headers:{ ...corsHeaders, "Content-Type":"application/json" }
    });
  } catch (e) {
    console.error("ics-import error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
