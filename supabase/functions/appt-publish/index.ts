import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PublishInput = {
  slug: string;
  title: string;
  description?: string;
  durations?: number[];
  window?: { start: string; end: string };
  buffer?: { before: number; after: number };
  max_per_day?: number;
  tz?: string;
  active?: boolean;
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

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("bad_user", { status: 401, headers: corsHeaders });

  const { data: flags } = await sb.rpc("get_user_flags", { p_user_id: user.id });
  if (!flags?.ff_calendar_appointments) {
    return new Response("flag_off", { status: 403, headers: corsHeaders });
  }

  let body: PublishInput;
  try {
    body = await req.json();
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const payload = {
    user_id: user.id,
    slug: body.slug,
    title: body.title,
    description: body.description ?? null,
    durations: body.durations?.length ? body.durations : [30, 45, 60],
    window: body.window
      ? JSON.parse(JSON.stringify(body.window))
      : { start: "09:00", end: "18:00" },
    buffer: body.buffer
      ? JSON.parse(JSON.stringify(body.buffer))
      : { before: 10, after: 10 },
    max_per_day: body.max_per_day ?? 8,
    tz: body.tz ?? "Asia/Dubai",
    active: body.active ?? true,
  };

  const { data: existing } = await sb
    .from("appointment_pages")
    .select("id")
    .eq("user_id", user.id)
    .eq("slug", body.slug)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("appointment_pages")
      .update(payload)
      .eq("id", existing.id);
    if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
    return new Response(
      JSON.stringify({ ok: true, id: existing.id, updated: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } else {
    const { data, error } = await sb
      .from("appointment_pages")
      .insert(payload)
      .select("id")
      .single();
    if (error) return new Response(error.message, { status: 500, headers: corsHeaders });
    return new Response(
      JSON.stringify({ ok: true, id: data.id, created: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
