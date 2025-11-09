import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

async function exchangeCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state", { status: 400 });
    }

    // فك تشفير state
    const stateData = JSON.parse(atob(state));
    const userId = stateData.user_id;

    if (!userId) {
      return new Response("Invalid state", { status: 400 });
    }

    // تبديل code بـ tokens
    const tokens: any = await exchangeCode(code);

    if (!tokens.refresh_token) {
      return new Response(
        "No refresh_token received. User may have previously granted access. Please revoke access in Google settings and try again.",
        { status: 400 }
      );
    }

    // حفظ في قاعدة البيانات
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("external_accounts")
      .upsert({
        owner_id: userId,
        provider: "google",
        refresh_token_enc: tokens.refresh_token, // في الإنتاج: استخدم pgp_sym_encrypt
        scope: tokens.scope,
        status: "connected",
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "owner_id,provider"
      });

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    // إعادة توجيه للتطبيق
    const redirectUrl = `${Deno.env.get("APP_URL") || "https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com"}/integrations?success=google`;
    
    return Response.redirect(redirectUrl, 302);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      `Error: ${String(error)}. You can close this window.`,
      { status: 400 }
    );
  }
});
