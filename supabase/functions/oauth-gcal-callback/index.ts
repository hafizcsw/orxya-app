import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encryptJson } from "../_shared/crypto.ts";

const html = (body:string)=> new Response(
  `<!doctype html><meta charset="utf-8"><body>${body}<script>window.close?.()</script>`,
  { headers: { "content-type": "text/html; charset=utf-8" } }
);

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase=createClient(supabaseUrl,supabaseAnonKey);

  if (error) return html(`فشل التفويض: ${error}`);
  if (!code || !state) return html("معاملات غير مكتملة.");

  const { data: rows } = await supabase
    .from("external_accounts")
    .select("owner_id,scopes")
    .eq("provider","google")
    .eq("status","pending")
    .order("updated_at",{ascending:false})
    .limit(50);

  const found = (rows ?? []).find(r=>{
    try { return JSON.parse(r.scopes ?? "{}").state === state; } catch { return false; }
  });
  if (!found) return html("STATE غير معروف.");

  const { codeVerifier } = JSON.parse(found.scopes ?? "{}");

  const clientId=Deno.env.get("GOOGLE_CLIENT_ID")!;
  const clientSecret=Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const redirectUri=Deno.env.get("GOOGLE_REDIRECT_URI")!;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method:"POST",
    headers:{ "content-type":"application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type:"authorization_code",
      code_verifier: codeVerifier
    })
  }).then(r=>r.json());

  if (!tokenRes?.access_token) return html("تعذّر استبدال الرمز.");

  const me = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers:{ "authorization": `Bearer ${tokenRes.access_token}` }
  }).then(r=>r.json());

  const encAccess = await encryptJson({ token: tokenRes.access_token });
  const encRefresh = tokenRes.refresh_token ? await encryptJson({ token: tokenRes.refresh_token }) : null;

  await supabase.from("external_accounts").upsert({
    owner_id: found.owner_id,
    provider: "google",
    provider_user_id: me?.sub ?? null,
    scopes: (tokenRes.scope ?? "").split(" "),
    access_token_enc: encAccess,
    refresh_token_enc: encRefresh,
    expires_at: tokenRes.expires_in ? new Date(Date.now()+tokenRes.expires_in*1000).toISOString() : null,
    status: "connected",
    updated_at: new Date().toISOString()
  }, { onConflict: "owner_id,provider" });

  return html("تم الربط بنجاح. يمكنك إغلاق النافذة.");
});
