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
    const mappings = Array.isArray(body.mappings) ? body.mappings : [];

    const rows = mappings
      .filter((m: any) => m.kind && m.calendar_id)
      .map((m: any) => ({
        owner_id: user.id,
        kind: String(m.kind),
        provider: "google",
        calendar_id: String(m.calendar_id),
      }));

    for (const r of rows) {
      await supabase
        .from("calendar_mapping")
        .upsert(r, { onConflict: "owner_id,kind" });
    }

    return json({ ok: true, upserted: rows.length });
  } catch (e) {
    console.error("calendar-map-set error", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
