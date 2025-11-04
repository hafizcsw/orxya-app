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
  guest_name: string;
  note?: string;
};

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return a1 < b2 && b1 < a2;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Public endpoint - no auth required for booking

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const body: Input = await req.json().catch(() => ({} as Input));
  if (!body.slug || !body.guest_name || !body.guest_email || !body.start || !body.duration) {
    return new Response(
      JSON.stringify({ error: "Missing required fields", code: "MISSING_FIELDS" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: page, error: pageErr } = await sb
    .from("appointment_pages")
    .select("*")
    .eq("slug", body.slug)
    .eq("active", true)
    .maybeSingle();
  if (pageErr || !page) {
    return new Response(
      JSON.stringify({ error: "Appointment page not found", code: "PAGE_NOT_FOUND" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.parse(body.start);
  const endTime = startTime + body.duration * 60e3;

  const { data: evts } = await sb
    .from("events")
    .select("starts_at,ends_at,busy_state")
    .gte("starts_at", new Date(startTime - 2 * 3600e3).toISOString())
    .lte("ends_at", new Date(endTime + 2 * 3600e3).toISOString())
    .eq("owner_id", page.user_id);

  const { data: books } = await sb
    .from("appointment_bookings")
    .select("start_at,end_at")
    .eq("page_id", page.id)
    .gte("start_at", new Date(startTime - 2 * 3600e3).toISOString())
    .lte("end_at", new Date(endTime + 2 * 3600e3).toISOString());

  const bufBefore = (page.buffer?.before ?? 10) * 60e3;
  const bufAfter = (page.buffer?.after ?? 10) * 60e3;
  const sWith = startTime - bufBefore;
  const eWith = endTime + bufAfter;

  const bad =
    (evts ?? []).some(
      (e) =>
        (e.busy_state ?? "busy") !== "free" &&
        overlaps(sWith, eWith, Date.parse(e.starts_at), Date.parse(e.ends_at))
    ) ||
    (books ?? []).some((b) =>
      overlaps(sWith, eWith, Date.parse(b.start_at), Date.parse(b.end_at))
    );

  if (bad) {
    return new Response(
      JSON.stringify({ error: "Time slot unavailable", code: "TIME_CONFLICT" }),
      { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: evt, error: eErr } = await sb
    .from("events")
    .insert({
      owner_id: page.user_id,
      title: `Appointment with ${body.guest_name}`,
      starts_at: new Date(startTime).toISOString(),
      ends_at: new Date(endTime).toISOString(),
      location: "Online",
      description: body.note ?? null,
    })
    .select("id")
    .single();

  if (eErr) {
    return new Response(
      JSON.stringify({ error: eErr.message, code: "EVENT_CREATE_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  await sb.from("event_attendees").insert({
    event_id: evt.id,
    email: body.guest_email,
    name: body.guest_name,
  });

  const { data: bk, error: bErr } = await sb
    .from("appointment_bookings")
    .insert({
      page_id: page.id,
      event_id: evt.id,
      guest_email: body.guest_email,
      guest_name: body.guest_name,
      start_at: new Date(startTime).toISOString(),
      end_at: new Date(endTime).toISOString(),
      status: "confirmed",
    })
    .select("id")
    .single();

  if (bErr) {
    return new Response(
      JSON.stringify({ error: bErr.message, code: "BOOKING_CREATE_FAILED" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true, booking_id: bk.id, event_id: evt.id }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
