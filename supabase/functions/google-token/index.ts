import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decryptToken } from "../_shared/token.ts";
import { encryptJson } from "../_shared/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: auth } }
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    const { data: acc } = await supabase
      .from("external_accounts")
      .select("provider, access_token_enc, refresh_token_enc, expires_at, scopes")
      .eq("owner_id", user.id)
      .eq("provider", "google")
      .maybeSingle();

    if (!acc) {
      return new Response(JSON.stringify({ ok: false, error: "NOT_CONNECTED" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    const accessToken = await decryptToken(acc.access_token_enc);
    const now = new Date(acc.expires_at ?? "").getTime();
    const future = new Date().getTime() + 120 * 1000;
    
    if (acc.expires_at && now > future) {
      return new Response(JSON.stringify({
        ok: true,
        access_token: accessToken,
        token_type: "Bearer"
      }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (!acc.refresh_token_enc) {
      return new Response(JSON.stringify({ ok: false, error: "NO_REFRESH" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" }
      });
    }
    
    const refreshToken = await decryptToken(acc.refresh_token_enc);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });

    if (!r.ok) {
      const t = await r.text();
      console.error("refresh failed:", t);
      return new Response(JSON.stringify({ ok: false, error: "REFRESH_FAILED" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" }
      });
    }

    const tok = await r.json() as any;
    const expiresAt = tok.expires_in 
      ? new Date(Date.now() + Number(tok.expires_in) * 1000).toISOString()
      : null;

    const encAccess = await encryptJson({ token: tok.access_token });

    await supabase
      .from("external_accounts")
      .update({
        access_token_enc: encAccess,
        expires_at: expiresAt
      })
      .eq("owner_id", user.id)
      .eq("provider", "google");

    return new Response(JSON.stringify({
      ok: true,
      access_token: tok.access_token,
      token_type: tok.token_type ?? "Bearer"
    }), { headers: { ...cors, "content-type": "application/json" } });

  } catch (e: any) {
    console.error("google-token error:", e);
    return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" }
    });
  }
});
