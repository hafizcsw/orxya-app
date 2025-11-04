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

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response("no_auth", { status: 401, headers: corsHeaders });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

  const { data: flags } = await sb.rpc("get_user_flags", { p_user_id: user.id });
  if (!flags?.ff_calendar_tasks_parity) {
    return new Response("flag_off", { status: 403, headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const { action, id } = body;

  console.log(`[task-apply] User ${user.id} - Action: ${action}, Task: ${id}`);

  if (action !== "toggle_done") {
    return new Response("unknown", { status: 400, headers: corsHeaders });
  }

  const { data: t } = await sb
    .from("tasks")
    .select("status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!t) {
    return new Response("not_found", { status: 404, headers: corsHeaders });
  }

  const newStatus = t.status === "done" ? "todo" : "done";

  const { error } = await sb.from("tasks").update({ status: newStatus }).eq("id", id);

  if (error) {
    console.error("[task-apply] Update error:", error);
    return new Response(error.message, { status: 500, headers: corsHeaders });
  }

  console.log(`[task-apply] Task ${id} status changed to ${newStatus}`);

  return new Response(JSON.stringify({ ok: true, status: newStatus }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
