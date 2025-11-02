import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function b64url(input: string) {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data).then(buf => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return b64url(binary);
  });
}

function randomString(n = 48) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return b64url(String.fromCharCode(...bytes));
}

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

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;
    const scope = "https://www.googleapis.com/auth/calendar.readonly";
    const state = randomString(32);
    const codeVerifier = randomString(64);
    const codeChallenge = await sha256(codeVerifier);

    await supabase.from("oauth_states").insert({
      state,
      owner_id: user.id,
      code_verifier: codeVerifier
    });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return new Response(JSON.stringify({ ok: true, url: authUrl.toString() }), {
      headers: { ...cors, "content-type": "application/json" }
    });
  } catch (e: any) {
    console.error("calendar-auth-start error:", e);
    return new Response(JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" }
    });
  }
});
