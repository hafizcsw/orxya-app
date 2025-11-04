import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Input = {
  slug: string;
  start: string;
  duration: number;
  guest_email: string;
  guest_name?: string;
  note?: string;
};

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

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

  let body: Input;
  try {
    body = await req.json();
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  const { data: page } = await sb
    .from("appointment_pages")
    .select("*")
    .eq("user_id", user.id)
    .eq("slug", body.slug)
    .eq("active", true)
    .maybeSingle();

  if (!page) {
    return new Response("page_not_found", { status: 404, headers: corsHeaders });
  }

  const start = Date.parse(body.start);
  const end = start + body.duration * 60e3;

  const { data: evts } = await sb
    .from("events")
    .select("starts_at,ends_at,busy_state")
    .gte("starts_at", new Date(start - 2 * 3600e3).toISOString())
    .lte("ends_at", new Date(end + 2 * 3600e3).toISOString())
    .eq("owner_id", user.id);

  const { data: books } = await sb
    .from("appointment_bookings")
    .select("start_at,end_at")
    .eq("page_id", page.id)
    .gte("start_at", new Date(start - 2 * 3600e3).toISOString())
    .lte("end_at", new Date(end + 2 * 3600e3).toISOString());

  const bufBefore = (page.buffer?.before ?? 10) * 60e3;
  const bufAfter = (page.buffer?.after ?? 10) * 60e3;
  const sWith = start - bufBefore;
  const eWith = end + bufAfter;

  const bad =
    (evts ?? []).some(
      (e) =>
        (e.busy_state ?? "busy") !== "free" &&
        overlaps(sWith, eWith, Date.parse(e.starts_at), Date.parse(e.ends_at))
    ) ||
    (books ?? []).some((b) =>
      overlaps(sWith, eWith, Date.parse(b.start_at), Date.parse(b.end_at))
    );

  if (bad) return new Response("slot_taken", { status: 409, headers: corsHeaders });

  const { data: evt, error: eErr } = await sb
    .from("events")
    .insert({
      owner_id: user.id,
      title: `Appointment with ${body.guest_name ?? body.guest_email}`,
      starts_at: new Date(start).toISOString(),
      ends_at: new Date(end).toISOString(),
      location: "Online",
      description: body.note ?? null,
      is_draft: false,
      kind: "appointment",
      source: "local",
      external_source: "appointment",
      calendar_id: null,
      busy_state: "busy",
      visibility: "default",
    })
    .select("id")
    .single();

  if (eErr) return new Response(eErr.message, { status: 500, headers: corsHeaders });

  await sb.from("event_attendees").insert({
    event_id: evt.id,
    email: body.guest_email,
    name: body.guest_name ?? null,
    can_modify: false,
    can_invite_others: false,
    can_see_guests: true,
  });

  const { data: bk, error: bErr } = await sb
    .from("appointment_bookings")
    .insert({
      page_id: page.id,
      event_id: evt.id,
      guest_email: body.guest_email,
      guest_name: body.guest_name ?? null,
      start_at: new Date(start).toISOString(),
      end_at: new Date(end).toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();

  if (bErr) return new Response(bErr.message, { status: 500, headers: corsHeaders });

  return new Response(
    JSON.stringify({ ok: true, booking_id: bk.id, event_id: evt.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
