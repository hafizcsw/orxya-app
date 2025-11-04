import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type CreateCmd = {
  action: "create";
  title: string;
  start: string;
  end: string;
  calendar_id?: string;
  tz?: string;
  all_day?: boolean;
  location?: string;
  description?: string;
  color?: string;
  rrule?: string;
  exdates?: string[];
  visibility?: string;
  busy_state?: string;
  notifications?: Array<{ method: "push" | "email"; minutes: number }>;
  conference?: { type: string; link?: string; pin?: string };
  attachments?: Array<{ name: string; url: string; drive_id?: string }>;
  attendees?: Array<{
    email: string;
    name?: string;
    can_modify?: boolean;
    can_invite_others?: boolean;
    can_see_guests?: boolean;
  }>;
  is_draft?: boolean;
  tags?: string[];
  kind?: "event" | "task" | "ooo" | "focus" | "appointment";
};

type UpdateCmd = { action: "update"; id: string; patch: Record<string, unknown> };
type MoveCmd = { action: "move"; id: string; start: string; end: string };
type ResizeCmd = { action: "resize"; id: string; end: string };
type DeleteCmd = { action: "delete"; id: string };
type Cmd = CreateCmd | UpdateCmd | MoveCmd | ResizeCmd | DeleteCmd;

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
  if (!flags?.ff_calendar_parity) {
    return new Response("flag_off", { status: 403, headers: corsHeaders });
  }

  let cmd: Cmd;
  try {
    cmd = await req.json();
  } catch {
    return new Response("bad_json", { status: 400, headers: corsHeaders });
  }

  console.log(`[calendar-apply] User ${user.id} - Action: ${cmd.action}`);

  if (cmd.action === "create") {
    const ev = {
      owner_id: user.id,
      title: cmd.title,
      starts_at: cmd.start,
      ends_at: cmd.end,
      calendar_id: cmd.calendar_id ?? null,
      tz: cmd.tz ?? null,
      all_day: cmd.all_day ?? false,
      location: cmd.location ?? null,
      description: cmd.description ?? null,
      color: cmd.color ?? null,
      rrule: cmd.rrule ?? null,
      exdates: cmd.exdates ? cmd.exdates.map((x) => new Date(x).toISOString()) : null,
      visibility: cmd.visibility ?? "default",
      busy_state: cmd.busy_state ?? "busy",
      notifications: cmd.notifications ? JSON.stringify(cmd.notifications) : "[]",
      conference: cmd.conference ? JSON.stringify(cmd.conference) : null,
      attachments: cmd.attachments ? JSON.stringify(cmd.attachments) : null,
      is_draft: cmd.is_draft ?? false,
      source: "local",
      external_source: "ui",
      tags: cmd.tags ?? null,
      kind: cmd.kind ?? "event",
    };

    const { data: e, error } = await sb.from("events").insert(ev).select("id").single();
    if (error) {
      console.error("[calendar-apply] Insert error:", error);
      return new Response(error.message, { status: 500, headers: corsHeaders });
    }

    if (cmd.attendees?.length) {
      const rows = cmd.attendees.map((a) => ({
        event_id: e.id,
        email: a.email,
        name: a.name ?? null,
        can_modify: !!a.can_modify,
        can_invite_others: a.can_invite_others ?? true,
        can_see_guests: a.can_see_guests ?? true,
      }));
      const { error: attErr } = await sb.from("event_attendees").insert(rows);
      if (attErr) {
        console.error("[calendar-apply] Attendees error:", attErr);
        return new Response(attErr.message, { status: 500, headers: corsHeaders });
      }
    }

    console.log(`[calendar-apply] Created event ${e.id}`);
    return new Response(JSON.stringify({ ok: true, id: e.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cmd.action === "update") {
    const { error } = await sb.from("events").update(cmd.patch).eq("id", cmd.id);
    if (error) {
      console.error("[calendar-apply] Update error:", error);
      return new Response(error.message, { status: 500, headers: corsHeaders });
    }
    console.log(`[calendar-apply] Updated event ${cmd.id}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cmd.action === "move") {
    const { error } = await sb
      .from("events")
      .update({ starts_at: cmd.start, ends_at: cmd.end })
      .eq("id", cmd.id);
    if (error) {
      console.error("[calendar-apply] Move error:", error);
      return new Response(error.message, { status: 500, headers: corsHeaders });
    }
    console.log(`[calendar-apply] Moved event ${cmd.id}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cmd.action === "resize") {
    const { error } = await sb.from("events").update({ ends_at: cmd.end }).eq("id", cmd.id);
    if (error) {
      console.error("[calendar-apply] Resize error:", error);
      return new Response(error.message, { status: 500, headers: corsHeaders });
    }
    console.log(`[calendar-apply] Resized event ${cmd.id}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (cmd.action === "delete") {
    const { error } = await sb.from("events").delete().eq("id", cmd.id);
    if (error) {
      console.error("[calendar-apply] Delete error:", error);
      return new Response(error.message, { status: 500, headers: corsHeaders });
    }
    console.log(`[calendar-apply] Deleted event ${cmd.id}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("unknown_action", { status: 400, headers: corsHeaders });
});
