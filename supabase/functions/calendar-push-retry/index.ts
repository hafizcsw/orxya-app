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

const isoNow = () => new Date().toISOString();

async function refreshGoogleToken(
  client_id: string,
  client_secret: string,
  refresh_token: string
) {
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
  if (!r.ok) throw new Error("refresh_failed");
  const j = await r.json();
  return { access_token: j.access_token as string, expires_in: j.expires_in as number };
}

async function ensureAccessToken(supabase: any, ownerId: string) {
  const { data: acc } = await supabase
    .from("external_accounts")
    .select("provider,access_token_enc,refresh_token_enc,expires_at")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .maybeSingle();

  if (!acc) throw new Error("NO_GOOGLE_ACCOUNT");

  const nowSec = Math.floor(Date.now() / 1000);
  const access_token = new TextDecoder().decode(acc.access_token_enc);

  if (acc.expires_at && acc.expires_at - 60 > nowSec) {
    return access_token;
  }

  if (!acc.refresh_token_enc) return access_token;

  const refresh_token = new TextDecoder().decode(acc.refresh_token_enc);
  const ref = await refreshGoogleToken(
    Deno.env.get("GOOGLE_CLIENT_ID")!,
    Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token
  );

  const newExp = nowSec + (ref.expires_in ?? 3600);
  const newAccessEnc = new TextEncoder().encode(ref.access_token);

  await supabase
    .from("external_accounts")
    .update({ access_token_enc: newAccessEnc, expires_at: newExp })
    .eq("owner_id", ownerId)
    .eq("provider", "google");

  return ref.access_token;
}

function gTs(ts: string, tz: string) {
  return { dateTime: ts, timeZone: tz };
}

function trans(free: boolean) {
  return free ? "transparent" : "opaque";
}

async function gPatch(access: string, calId: string, evId: string, patch: any) {
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calId
    )}/events/${encodeURIComponent(evId)}`,
    {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${access}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(patch),
    }
  );
  if (!r.ok) throw new Error(await r.text());
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

    const { data: { user } } = await supabase.auth.getUser().catch(() => ({
      data: { user: null },
    }));

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit ?? 200), 500);

    // Scope: user-only or global?
    let q = supabase
      .from("events")
      .select(
        "id,owner_id,title,description,starts_at,ends_at,external_source,external_calendar_id,external_event_id,last_push_status,pending_push,retry_count,version"
      )
      .eq("pending_push", true)
      .not("external_source", "is", null)
      .not("external_calendar_id", "is", null)
      .not("external_event_id", "is", null)
      .lte("next_retry_at", isoNow())
      .order("next_retry_at", { ascending: true })
      .limit(limit);

    if (user) {
      q = q.eq("owner_id", user.id);
    }

    const { data: rows } = await q;
    if (!rows || rows.length === 0) return json({ ok: true, processed: 0 });

    // Group by owner
    const byOwner: Record<string, any[]> = {};
    for (const r of rows) {
      (byOwner[r.owner_id] ??= []).push(r);
    }

    let processed = 0,
      ok = 0,
      failed = 0;

    for (const ownerId of Object.keys(byOwner)) {
      // Check writeback enabled
      const { data: prof } = await supabase
        .from("profiles")
        .select("calendar_writeback,timezone")
        .eq("id", ownerId)
        .maybeSingle();

      if (!prof?.calendar_writeback) {
        continue;
      }

      const tz = prof.timezone ?? "UTC";
      let access: string;

      try {
        access = await ensureAccessToken(supabase, ownerId);
      } catch (e) {
        // Token error - mark all events for this user as failed
        for (const ev of byOwner[ownerId]) {
          const nextDelayMin = Math.min(360, Math.pow(2, ev.retry_count || 0));
          await supabase
            .from("events")
            .update({
              retry_count: (ev.retry_count || 0) + 1,
              next_retry_at: new Date(
                Date.now() + nextDelayMin * 60 * 1000
              ).toISOString(),
              last_error: "TOKEN_ERROR",
              last_push_status: "failed",
            })
            .eq("id", ev.id);

          await supabase.from("push_log").insert({
            owner_id: ownerId,
            event_id: ev.id,
            status: "failed",
            error: "TOKEN_ERROR",
          });

          failed++;
          processed++;
        }
        continue;
      }

      for (const ev of byOwner[ownerId]) {
        try {
          // Build PATCH from local state
          const patch: any = {};
          if (ev.title) patch.summary = ev.title;
          if (ev.description !== undefined) patch.description = ev.description ?? null;
          if (ev.starts_at) patch.start = gTs(ev.starts_at, tz);
          if (ev.ends_at) patch.end = gTs(ev.ends_at, tz);

          await gPatch(access, ev.external_calendar_id, ev.external_event_id, patch);

          await supabase
            .from("events")
            .update({
              pending_push: false,
              last_push_status: "ok",
              last_push_at: isoNow(),
              last_error: null,
              retry_count: 0,
            })
            .eq("id", ev.id);

          await supabase.from("push_log").insert({
            owner_id: ownerId,
            event_id: ev.id,
            status: "ok",
          });

          ok++;
          processed++;
        } catch (e) {
          const errTxt = String(e).slice(0, 1500);
          const nextDelayMin = Math.min(360, Math.pow(2, ev.retry_count || 0));

          await supabase
            .from("events")
            .update({
              retry_count: (ev.retry_count || 0) + 1,
              next_retry_at: new Date(
                Date.now() + nextDelayMin * 60 * 1000
              ).toISOString(),
              last_error: errTxt,
              last_push_status: "failed",
            })
            .eq("id", ev.id);

          await supabase.from("push_log").insert({
            owner_id: ownerId,
            event_id: ev.id,
            status: "failed",
            error: errTxt,
          });

          failed++;
          processed++;
        }
      }
    }

    return json({ ok: true, processed, succeeded: ok, failed });
  } catch (e) {
    console.error("calendar-push-retry error", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
