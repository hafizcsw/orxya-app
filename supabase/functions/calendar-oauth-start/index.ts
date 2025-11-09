import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // إنشاء state للتحقق (يحتوي على user_id)
    const state = btoa(JSON.stringify({ user_id: userId, nonce: crypto.randomUUID() }));

    const params = new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI")!,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return new Response(
      JSON.stringify({ url: authUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("OAuth start error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
