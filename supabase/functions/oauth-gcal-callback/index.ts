import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptJson } from "../_shared/crypto.ts";

const html = (body: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><body>${body}<script>window.close?.()</script>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (error) return html(`فشل التفويض: ${error}`);
    if (!code || !state) return html("معاملات غير مكتملة.");

    // Find pending account with matching state
    const { data: rows } = await supabase
      .from("external_accounts")
      .select("owner_id,scopes")
      .eq("provider", "google")
      .eq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(50);

    const found = (rows ?? []).find((r) => {
      try {
        return JSON.parse(r.scopes ?? "{}").state === state;
      } catch {
        return false;
      }
    });

    if (!found) return html("STATE غير معروف.");

    // Exchange code for tokens
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
      }),
    });

    const tokens = await tokenRes.json() as any;
    if (!tokenRes.ok) return html(`فشل استبدال الرمز: ${tokens?.error || "خطأ غير معروف"}`);

    // Get user info
    const meRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const me = await meRes.json() as any;

    // Get primary calendar
    let primary_calendar_id = "primary";
    try {
      const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const calList = await calRes.json() as any;
      const primary = (calList.items ?? []).find((c: any) => c.primary) ?? (calList.items ?? [])[0];
      if (primary?.id) primary_calendar_id = primary.id;
    } catch {}

    // Encrypt tokens
    const encAccess = await encryptJson({ token: tokens.access_token });
    const encRefresh = tokens.refresh_token ? await encryptJson({ token: tokens.refresh_token }) : null;

    const expires_at = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store account
    await supabase.from("external_accounts").upsert({
      owner_id: found.owner_id,
      provider: "google",
      provider_user_id: me?.sub ?? null,
      account_email: me?.email ?? null,
      scopes: (tokens.scope ?? "").split(" "),
      access_token_enc: encAccess,
      refresh_token_enc: encRefresh,
      expires_at,
      primary_calendar_id,
      status: "connected",
      updated_at: new Date().toISOString(),
    }, { onConflict: "owner_id,provider" });

    return html("تم الربط بنجاح. يمكنك إغلاق النافذة.");
  } catch (e: any) {
    console.error("oauth-gcal-callback error:", e);
    return html(`خطأ: ${e?.message ?? e}`);
  }
});
