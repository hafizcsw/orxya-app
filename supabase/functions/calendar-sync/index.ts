import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function windowRange(days = 30) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const end = new Date();
  end.setDate(end.getDate() + days);
  return { start: start.toISOString(), end: end.toISOString() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    // Get valid access token
    const tokRes = await fetch(`${supabaseUrl}/functions/v1/google-token`, {
      method: "POST",
      headers: { Authorization: auth }
    });
    const tok = await tokRes.json().catch(() => null);
    if (!tok?.ok) {
      return new Response(JSON.stringify({ ok: false, error: "NO_TOKEN" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    const { start, end } = windowRange(30);
    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("timeMin", start);
    url.searchParams.set("timeMax", end);
    url.searchParams.set("maxResults", "2500");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `${tok.token_type ?? "Bearer"} ${tok.access_token}` }
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("calendar list failed:", t);
      return new Response(JSON.stringify({ ok: false, error: "GOOGLE_API", details: t }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    const j = await r.json() as any;
    let saved = 0;

    for (const item of (j.items ?? [])) {
      const id = item.id as string;
      const title = item.summary ?? "(no title)";
      const desc = item.description ?? null;
      const location = item.location ?? null;

      const startIso = item.start?.dateTime ?? (item.start?.date ? `${item.start.date}T00:00:00.000Z` : null);
      const endIso = item.end?.dateTime ?? (item.end?.date ? `${item.end.date}T00:00:00.000Z` : null);
      if (!startIso || !endIso) continue;

      const { error } = await supabase.from("events").upsert({
        owner_id: user.id,
        external_source: "google",
        external_id: id,
        title,
        description: desc,
        starts_at: startIso,
        ends_at: endIso
      }, { onConflict: "owner_id,external_source,external_id" });

      if (!error) saved++;
    }

    // Run conflict check after import
    await supabase.functions.invoke("conflict-check", { body: {} });

    return new Response(JSON.stringify({ ok: true, imported: saved }), {
      headers: { ...cors, "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("calendar-sync error:", e);
    return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" }
    });
  }
});
