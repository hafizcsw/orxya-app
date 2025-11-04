import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function icsEscape(s: string) {
  return s.replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

  const { data: flags } = await sb.rpc("get_user_flags", { p_user_id: user.id });
  if (!flags?.ff_calendar_ics) {
    return new Response("flag_off", { status: 403, headers: corsHeaders });
  }

  const { start, end } = await req.json().catch(() => ({}));
  if (!start || !end) {
    return new Response("need_start_end", { status: 400, headers: corsHeaders });
  }

  const { data: evts, error } = await sb
    .from("events")
    .select("id,title,description,location,starts_at,ends_at,rrule,all_day")
    .gte("starts_at", start)
    .lte("ends_at", end)
    .eq("owner_id", user.id);

  if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Oryxa//Calendar//EN");

  (evts ?? []).forEach((e) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${e.id}@oryxa`);
    lines.push(
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z")}`
    );

    if (e.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${e.starts_at.slice(0, 10).replace(/-/g, "")}`);
      lines.push(`DTEND;VALUE=DATE:${e.ends_at.slice(0, 10).replace(/-/g, "")}`);
    } else {
      const fmt = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
      lines.push(`DTSTART:${fmt(e.starts_at)}`);
      lines.push(`DTEND:${fmt(e.ends_at)}`);
    }

    if (e.rrule) lines.push(`RRULE:${e.rrule}`);
    if (e.title) lines.push(`SUMMARY:${icsEscape(e.title)}`);
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${icsEscape(e.description)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");
  const ics = lines.join("\r\n");

  return new Response(ics, {
    headers: { ...corsHeaders, "Content-Type": "text/calendar; charset=utf-8" },
  });
});
