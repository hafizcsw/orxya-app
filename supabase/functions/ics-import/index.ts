import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Imported = {
  title?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  rrule?: string;
};

function parseICS(ics: string): Imported[] {
  const lines = ics.split(/\r?\n/);
  const out: Imported[] = [];
  let cur: any = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) out.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    const [k, ...rest] = line.split(":");
    const v = rest.join(":");

    if (k.startsWith("SUMMARY")) {
      cur.title = v?.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
    } else if (k.startsWith("LOCATION")) {
      cur.location = v?.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
    } else if (k.startsWith("DESCRIPTION")) {
      cur.description = v?.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";");
    } else if (k === "DTSTART" || k.startsWith("DTSTART")) {
      cur.start =
        v?.length === 8
          ? new Date(
              v.slice(0, 4) + "-" + v.slice(4, 6) + "-" + v.slice(6, 8) + "T00:00:00Z"
            ).toISOString()
          : new Date(v.replace(/Z?$/, "Z")).toISOString();
    } else if (k === "DTEND" || k.startsWith("DTEND")) {
      cur.end =
        v?.length === 8
          ? new Date(
              v.slice(0, 4) + "-" + v.slice(4, 6) + "-" + v.slice(6, 8) + "T00:00:00Z"
            ).toISOString()
          : new Date(v.replace(/Z?$/, "Z")).toISOString();
    } else if (k === "RRULE") {
      cur.rrule = v;
    }
  }

  return out;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) {
    return new Response(
      JSON.stringify({ error: "No authorization header", code: "NO_AUTH" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return new Response(
      JSON.stringify({ error: "Invalid user", code: "INVALID_USER" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: flags } = await sb.rpc("get_user_flags", { p_user_id: user.id });
  if (!flags?.ff_calendar_ics) {
    return new Response(
      JSON.stringify({ error: "ICS import feature not enabled", code: "FEATURE_DISABLED" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { ics }: { ics?: string } = await req.json().catch(() => ({}));
  if (!ics) {
    return new Response(
      JSON.stringify({ error: "Missing ICS data", code: "MISSING_ICS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const evts = parseICS(ics);
  if (!evts.length) {
    return new Response(
      JSON.stringify({ error: "No events found in ICS", code: "NO_EVENTS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const rows = evts.map((e) => ({
    owner_id: user.id,
    title: e.title ?? "(no title)",
    starts_at: e.start ?? new Date().toISOString(),
    ends_at: e.end ?? new Date(Date.now() + 30 * 60e3).toISOString(),
    location: e.location ?? null,
    description: e.description ?? null,
    rrule: e.rrule ?? null,
    is_draft: true,
    source: "import",
    external_source: "ics",
  }));

  const { data, error } = await sb.from("events").insert(rows).select("id");
  if (error) return new Response(error.message, { status: 500, headers: corsHeaders });

  return new Response(JSON.stringify({ ok: true, inserted: data.length }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
