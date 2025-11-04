import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

    const { action } = await req.json().catch(() => ({}));

    // Ensure user_focus_state row exists
    await sb.from("user_focus_state").upsert({ user_id: user.id }).eq("user_id", user.id);

    if (action === "get") {
      const { data } = await sb.from("user_focus_state")
        .select("active,updated_at")
        .eq("user_id", user.id)
        .single();
      return new Response(
        JSON.stringify({ ok: true, ...data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Toggle or set true/false
    const set = action === "set_true" ? true : action === "set_false" ? false : undefined;
    const { data: cur } = await sb.from("user_focus_state")
      .select("active")
      .eq("user_id", user.id)
      .single();
    
    const next = (set !== undefined) ? set : !cur?.active;
    
    const { data: upd, error } = await sb.from("user_focus_state")
      .update({ active: next, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("active,updated_at")
      .single();

    if (error) return new Response(error.message, { status: 400, headers: corsHeaders });

    return new Response(
      JSON.stringify({ ok: true, ...upd }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('[focus-toggle] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
