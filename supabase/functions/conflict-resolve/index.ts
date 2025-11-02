import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }), {
        status: 401,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const id = body.id as string;
    const action = (body.action ?? "accept") as "accept" | "ignore" | "snooze";
    const snooze_until = body.snooze_until ?? null;

    if (!id) {
      return new Response(JSON.stringify({ ok: false, error: "MISSING_ID" }), {
        status: 400,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    const { data: c } = await supabase
      .from("conflicts")
      .select("*")
      .eq("owner_id", user.id)
      .eq("id", id)
      .maybeSingle();

    if (!c) {
      return new Response(JSON.stringify({ ok: false, error: "NOT_FOUND" }), {
        status: 404,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (action === "ignore") {
      await supabase
        .from("conflicts")
        .update({
          status: "ignored",
          decided_action: "ignore",
          decided_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", user.id);

      return new Response(JSON.stringify({ ok: true, status: "ignored" }), {
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (action === "snooze") {
      const until = snooze_until ?? new Date(Date.now() + 30 * 60000).toISOString();
      await supabase
        .from("conflicts")
        .update({
          status: "snoozed",
          snooze_until: until,
          decided_action: "snooze",
          decided_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("owner_id", user.id);

      return new Response(
        JSON.stringify({ ok: true, status: "snoozed", snooze_until: until }),
        { headers: { ...cors, "content-type": "application/json" } }
      );
    }

    // accept suggestion
    const s = c.suggestion ?? {};
    const eventId = c.event_id;

    const { data: ev } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!ev) {
      return new Response(JSON.stringify({ ok: false, error: "EVENT_NOT_FOUND" }), {
        status: 404,
        headers: { ...cors, "content-type": "application/json" },
      });
    }

    if (s.type === "delay_start" && s.new_start) {
      await supabase
        .from("events")
        .update({
          starts_at: s.new_start,
        })
        .eq("id", ev.id)
        .eq("owner_id", user.id);
    } else if (s.type === "truncate_end" && s.new_end) {
      await supabase
        .from("events")
        .update({
          ends_at: s.new_end,
        })
        .eq("id", ev.id)
        .eq("owner_id", user.id);
    } else if (s.type === "split" && Array.isArray(s.parts) && s.parts.length === 2) {
      await supabase
        .from("events")
        .update({
          starts_at: s.parts[0].new_start,
          ends_at: s.parts[0].new_end,
        })
        .eq("id", ev.id)
        .eq("owner_id", user.id);

      await supabase.from("events").insert({
        owner_id: user.id,
        external_source: "local",
        title: ev.title + " (بعد الصلاة)",
        description: ev.description,
        starts_at: s.parts[1].new_start,
        ends_at: s.parts[1].new_end,
      });
    }

    // Attempt write-back to Google Calendar if enabled
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("calendar_writeback")
        .eq("id", user.id)
        .maybeSingle();

      if (prof?.calendar_writeback && ev.external_source === "google") {
        await supabase.functions.invoke("calendar-push", {
          body: { mode: "apply_suggestion", conflict_id: id }
        });
      }
    } catch (pushErr) {
      console.error("calendar writeback failed:", pushErr);
      await supabase
        .from("events")
        .update({
          pending_push: true,
          last_push_status: "failed",
          last_push_at: new Date().toISOString()
        })
        .eq("id", ev.id)
        .eq("owner_id", user.id);
    }

    await supabase
      .from("conflicts")
      .update({
        status: "resolved",
        decided_action: "accept",
        decided_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", user.id);

    return new Response(JSON.stringify({ ok: true, status: "resolved" }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error("conflict-resolve error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e?.message ?? e) }),
      { status: 500, headers: { ...cors, "content-type": "application/json" } }
    );
  }
});
