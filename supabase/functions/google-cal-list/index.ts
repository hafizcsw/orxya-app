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

async function refreshToken(cid: string, cs: string, rt: string) {
  const body = new URLSearchParams({
    client_id: cid,
    client_secret: cs,
    refresh_token: rt,
    grant_type: "refresh_token",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!r.ok) throw new Error("refresh_failed");
  return await r.json();
}

async function ensureAccessToken(supabase: any, ownerId: string) {
  const { data: acc } = await supabase
    .from("external_accounts")
    .select("access_token_enc,refresh_token_enc,expires_at")
    .eq("owner_id", ownerId)
    .eq("provider", "google")
    .maybeSingle();

  if (!acc) throw new Error("NO_GOOGLE_ACCOUNT");

  const now = Math.floor(Date.now() / 1000);
  const access_token = new TextDecoder().decode(acc.access_token_enc);

  if (acc.expires_at && acc.expires_at - 60 > now) {
    return access_token;
  }

  if (!acc.refresh_token_enc) return access_token;

  const refresh_token = new TextDecoder().decode(acc.refresh_token_enc);
  const tok = await refreshToken(
    Deno.env.get("GOOGLE_CLIENT_ID")!,
    Deno.env.get("GOOGLE_CLIENT_SECRET")!,
    refresh_token
  );

  const access = tok.access_token as string;
  const exp = now + Number(tok.expires_in ?? 3600);
  const newAccessEnc = new TextEncoder().encode(access);

  await supabase
    .from("external_accounts")
    .update({ access_token_enc: newAccessEnc, expires_at: exp })
    .eq("owner_id", ownerId)
    .eq("provider", "google");

  return access;
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

    const access = await ensureAccessToken(supabase, user.id);

    const r = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: { authorization: `Bearer ${access}` },
      }
    );

    if (!r.ok) throw new Error(await r.text());
    const { items } = await r.json();

    const rows = (items ?? []).map((c: any) => ({
      owner_id: user.id,
      provider: "google",
      calendar_id: c.id,
      calendar_name: c.summary,
      access_role: c.accessRole,
      primary_flag: !!c.primary,
      color: c.backgroundColor,
      synced_at: new Date().toISOString(),
    }));

    if (rows.length) {
      const { error } = await supabase.from("external_calendars").upsert(rows);
      if (error) throw error;
    }

    return json({ ok: true, count: rows.length, calendars: rows });
  } catch (e) {
    console.error("google-cal-list error", e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
