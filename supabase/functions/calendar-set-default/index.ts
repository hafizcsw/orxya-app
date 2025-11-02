// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider ?? "google");
    const calendar_id = String(body.calendar_id ?? "");
    const calendar_name = String(body.calendar_name ?? "");

    if (!calendar_id)
      return json({ ok: false, error: "MISSING_CALENDAR_ID" }, 400);

    const { error } = await supabase
      .from("profiles")
      .update({
        default_calendar_provider: provider,
        default_calendar_id: calendar_id,
        default_calendar_name: calendar_name || null,
        calendar_writeback: true,
      })
      .eq("id", user.id);

    if (error) throw error;

    // Set selected=true for chosen calendar
    await supabase
      .from("external_calendars")
      .update({ selected: false })
      .eq("owner_id", user.id)
      .eq("provider", provider);

    await supabase
      .from("external_calendars")
      .update({ selected: true })
      .eq("owner_id", user.id)
      .eq("provider", provider)
      .eq("calendar_id", calendar_id);

    return json({ ok: true });
  } catch (e) {
    console.error("calendar-set-default error", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
