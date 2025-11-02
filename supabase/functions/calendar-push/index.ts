// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" },
  });
}

const nowISO = () => new Date().toISOString();

async function refreshGoogleToken(
  client_id: string,
  client_secret: string,
  refresh_token: string
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error("google token refresh failed");
  const j = await r.json();
  return { access_token: j.access_token, expires_in: j.expires_in };
}

async function ensureAccessToken(supabase: any, userId: string): Promise<string> {
  const { data: acc } = await supabase
    .from("external_accounts")
    .select("provider,access_token_enc,refresh_token_enc,expires_at")
    .eq("owner_id", userId)
    .eq("provider", "google")
    .maybeSingle();

  if (!acc) throw new Error("NO_GOOGLE_ACCOUNT");

  const client_id = Deno.env.get("GOOGLE_CLIENT_ID")!;
  const client_sec = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
  const nowSec = Math.floor(Date.now() / 1000);

  // Decode token (assuming it's stored as base64 or plaintext for now)
  const access_token = new TextDecoder().decode(acc.access_token_enc);

  if (acc.expires_at && acc.expires_at - 60 > nowSec) {
    return access_token;
  }

  if (!acc.refresh_token_enc) return access_token;

  const refresh_token = new TextDecoder().decode(acc.refresh_token_enc);
  const ref = await refreshGoogleToken(client_id, client_sec, refresh_token);
  const newExp = nowSec + (ref.expires_in ?? 3600);

  const newAccessEnc = new TextEncoder().encode(ref.access_token);
  await supabase
    .from("external_accounts")
    .update({ access_token_enc: newAccessEnc, expires_at: newExp })
    .eq("owner_id", userId)
    .eq("provider", "google");

  return ref.access_token;
}

function toGcalDateTime(ts: string, tz?: string) {
  return { dateTime: ts, timeZone: tz ?? "UTC" };
}

async function gcalPatchEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  patch: any
) {
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error("GCAL_PATCH_FAIL: " + t);
  }
  return await r.json();
}

async function gcalInsertEvent(accessToken: string, calendarId: string, evt: any) {
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(evt),
    }
  );
  if (!r.ok) {
    const t = await r.text();
    throw new Error("GCAL_INSERT_FAIL: " + t);
  }
  return await r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    const { data: prof } = await supabase
      .from("profiles")
      .select("calendar_writeback,timezone")
      .eq("id", user.id)
      .maybeSingle();

    if (!prof?.calendar_writeback) {
      return json({ ok: false, error: "WRITEBACK_DISABLED" }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const mode = (body.mode ?? "apply_suggestion") as
      | "apply_suggestion"
      | "patch";
    const tz = prof.timezone ?? "UTC";

    const access = await ensureAccessToken(supabase, user.id);

    if (mode === "apply_suggestion") {
      const conflictId = body.conflict_id as string;
      if (!conflictId) return json({ ok: false, error: "MISSING_CONFLICT_ID" }, 400);

      const { data: c } = await supabase
        .from("conflicts")
        .select("*, events(*)")
        .eq("owner_id", user.id)
        .eq("id", conflictId)
        .maybeSingle();

      if (!c?.events) return json({ ok: false, error: "CONFLICT_NOT_FOUND" }, 404);

      const ev = c.events;
      if (
        ev.external_source !== "google" ||
        !ev.external_calendar_id ||
        !ev.external_event_id
      ) {
        return json({ ok: false, error: "NOT_GOOGLE_EVENT" }, 400);
      }

      const calId = ev.external_calendar_id;
      const evId = ev.external_event_id;
      const sug = c.suggestion ?? {};

      if (sug.type === "delay_start" && sug.new_start) {
        const patch = { start: toGcalDateTime(sug.new_start, tz) };
        const res = await gcalPatchEvent(access, calId, evId, patch);
        await supabase
          .from("events")
          .update({
            starts_at: sug.new_start,
            last_push_status: "ok",
            last_push_at: nowISO(),
            pending_push: false,
            version: ev.version + 1,
          })
          .eq("id", ev.id)
          .eq("owner_id", user.id);
        return json({ ok: true, result: res });
      }

      if (sug.type === "truncate_end" && sug.new_end) {
        const patch = { end: toGcalDateTime(sug.new_end, tz) };
        const res = await gcalPatchEvent(access, calId, evId, patch);
        await supabase
          .from("events")
          .update({
            ends_at: sug.new_end,
            last_push_status: "ok",
            last_push_at: nowISO(),
            pending_push: false,
            version: ev.version + 1,
          })
          .eq("id", ev.id)
          .eq("owner_id", user.id);
        return json({ ok: true, result: res });
      }

      if (sug.type === "split" && Array.isArray(sug.parts) && sug.parts.length === 2) {
        const p1 = {
          start: toGcalDateTime(sug.parts[0].new_start, tz),
          end: toGcalDateTime(sug.parts[0].new_end, tz),
        };
        await gcalPatchEvent(access, calId, evId, p1);
        await supabase
          .from("events")
          .update({
            starts_at: sug.parts[0].new_start,
            ends_at: sug.parts[0].new_end,
            last_push_status: "ok",
            last_push_at: nowISO(),
            pending_push: false,
            version: ev.version + 1,
          })
          .eq("id", ev.id)
          .eq("owner_id", user.id);

        const newEvt = {
          summary: (ev.title ?? "Event") + " (بعد الصلاة)",
          description: ev.description ?? null,
          start: toGcalDateTime(sug.parts[1].new_start, tz),
          end: toGcalDateTime(sug.parts[1].new_end, tz),
          transparency: "opaque",
        };
        const ins = await gcalInsertEvent(access, calId, newEvt);

        await supabase.from("events").insert({
          owner_id: user.id,
          external_source: "google",
          external_calendar_id: calId,
          external_event_id: ins.id,
          title: newEvt.summary,
          description: newEvt.description,
          starts_at: sug.parts[1].new_start,
          ends_at: sug.parts[1].new_end,
          last_push_status: "ok",
          last_push_at: nowISO(),
          pending_push: false,
          version: 0,
        });

        return json({ ok: true, result: "split_applied" });
      }

      if (sug.type === "mark_free") {
        const patch = { transparency: "transparent" };
        const res = await gcalPatchEvent(access, calId, evId, patch);
        await supabase
          .from("events")
          .update({
            last_push_status: "ok",
            last_push_at: nowISO(),
            pending_push: false,
            version: ev.version + 1,
          })
          .eq("id", ev.id)
          .eq("owner_id", user.id);
        return json({ ok: true, result: res });
      }

      return json({ ok: false, error: "NO_APPLY_ACTION" }, 400);
    }

    // mode === 'patch'
    const { event_id, patch } = body;
    if (!event_id || !patch) return json({ ok: false, error: "MISSING_INPUT" }, 400);

    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("owner_id", user.id)
      .eq("id", event_id)
      .maybeSingle();

    if (
      !ev ||
      ev.external_source !== "google" ||
      !ev.external_calendar_id ||
      !ev.external_event_id
    ) {
      return json({ ok: false, error: "NOT_GOOGLE_EVENT" }, 400);
    }

    const gPatch: any = {};
    if (patch.starts_at) gPatch.start = toGcalDateTime(patch.starts_at, tz);
    if (patch.ends_at) gPatch.end = toGcalDateTime(patch.ends_at, tz);
    if (patch.title) gPatch.summary = patch.title;
    if (patch.description !== undefined) gPatch.description = patch.description ?? null;

    const res = await gcalPatchEvent(access, ev.external_calendar_id, ev.external_event_id, gPatch);

    await supabase
      .from("events")
      .update({
        starts_at: patch.starts_at ?? ev.starts_at,
        ends_at: patch.ends_at ?? ev.ends_at,
        title: patch.title ?? ev.title,
        description: patch.description !== undefined ? patch.description : ev.description,
        last_push_status: "ok",
        last_push_at: nowISO(),
        pending_push: false,
        version: ev.version + 1,
      })
      .eq("id", ev.id)
      .eq("owner_id", user.id);

    return json({ ok: true, result: res });
  } catch (e) {
    console.error("calendar-push error", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
