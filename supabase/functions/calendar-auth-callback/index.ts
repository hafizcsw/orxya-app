import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptJson } from "../_shared/crypto.ts";

const html = (body: string, code = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><body>${body}<script>window.close?.()</script>`,
    { status: code, headers: { "content-type": "text/html; charset=utf-8" } }
  );

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) return html(`<h3>Google OAuth Error</h3><p>${error}</p>`, 400);
    if (!code || !state) return html(`<h3>Missing code/state</h3>`, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: row } = await supabase
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (!row) return html(`<h3>Invalid/expired state</h3>`, 400);

    const clientId = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("GOOGLE_REDIRECT_URI")!;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: row.code_verifier
      })
    });

    if (!tokenRes.ok) {
      const t = await tokenRes.text();
      console.error("token exchange failed:", t);
      return html(`<h3>Token exchange failed</h3><pre>${t}</pre>`, 400);
    }

    const tokens = await tokenRes.json() as any;
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString()
      : null;

    const encAccess = await encryptJson({ token: tokens.access_token });
    const encRefresh = tokens.refresh_token ? await encryptJson({ token: tokens.refresh_token }) : null;

    await supabase.from("external_accounts").upsert({
      owner_id: row.owner_id,
      provider: "google",
      scopes: (tokens.scope ?? "calendar.readonly").split(" "),
      access_token_enc: encAccess,
      refresh_token_enc: encRefresh,
      expires_at: expiresAt,
      status: "connected"
    }, { onConflict: "owner_id,provider" });

    await supabase.from("oauth_states").delete().eq("state", state);

    return html(`<h3>✅ متصل بنجاح</h3><p>يمكنك إغلاق هذه النافذة.</p>`);
  } catch (e: any) {
    console.error("calendar-auth-callback error:", e);
    return html(`<h3>خطأ</h3><p>${e?.message ?? e}</p>`, 500);
  }
});
