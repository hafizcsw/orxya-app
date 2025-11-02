import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function rand(n = 24) {
  return crypto.randomUUID().replace(/-/g, "").slice(0, n);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;
    const scope = encodeURIComponent([
      "https://www.googleapis.com/auth/calendar.readonly",
      "openid",
      "email",
      "profile",
    ].join(" "));

    const state = rand(32);

    // Store state temporarily in external_accounts for validation
    await supabase.from("external_accounts").upsert({
      owner_id: user.id,
      provider: "google",
      scopes: JSON.stringify({ state, created_at: new Date().toISOString() }),
      status: "pending",
    }, { onConflict: "owner_id,provider" });

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&access_type=offline&prompt=consent&scope=${scope}&state=${state}`;

    return new Response(JSON.stringify({ ok: true, url: authUrl }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("oauth-gcal-start error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
