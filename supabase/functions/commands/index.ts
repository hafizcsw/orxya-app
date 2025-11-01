// Deno Edge Function: commands
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

const AddDailyLog = z.object({
  log_date: z.string(),                  // "2025-11-01"
  work_hours: z.number().optional(),
  study_hours: z.number().optional(),
  mma_hours: z.number().optional(),
  walk_min: z.number().int().optional(),
  project_focus: z.string().optional(),
  weight_kg: z.number().optional(),
  notes: z.string().optional(),
});
const AddFinance = z.object({
  entry_date: z.string(),
  type: z.enum(["income", "spend"]),
  amount_usd: z.number(),
  category: z.string().optional(),
  note: z.string().optional(),
});
const AddSale = z.object({
  sale_date: z.string(),
  type: z.enum(["scholarship", "villa", "other"]),
  item: z.string().optional(),
  qty: z.number().int().optional(),
  price_usd: z.number().optional(),
  profit_usd: z.number().optional(),
});
const SetAlarm = z.object({
  label: z.string(),
  time_local: z.string(), // "21:30"
  rrule: z.string().optional(),
});

const AddProject = z.object({
  title: z.string(),
  status: z.enum(["Active", "Archived"]).optional(),
  priority: z.string().optional(),
  target: z.string().optional(),
  deadline: z.string().optional(),
  next_action: z.string().optional(),
  notes: z.string().optional(),
});

const AddTask = z.object({
  project_id: z.string(),
  title: z.string(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  order_pos: z.number().optional(),
  due_date: z.string().optional(),
});

const MoveTask = z.object({
  task_id: z.string(),
  to_status: z.enum(["todo", "doing", "done"]),
  new_order_pos: z.number(),
});

const SetTaskStatus = z.object({
  task_id: z.string(),
  status: z.enum(["todo", "doing", "done"]),
});

const BodySchema = z.object({
  command: z.enum([
    "add_daily_log",
    "add_finance",
    "add_sale",
    "set_alarm",
    "add_project",
    "add_task",
    "move_task",
    "set_task_status"
  ]),
  idempotency_key: z.string().min(8),
  payload: z.unknown(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...cors } });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }, // keep RLS with user JWT
    });

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.flatten());
      return json({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() }, 400);
    }

    // Ensure user session (RLS)
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error("Auth error:", userErr);
      return json({ ok: false, error: "UNAUTHENTICATED" }, 401);
    }

    const { command, idempotency_key } = parsed.data;

    // Idempotency check
    const { data: existing } = await supabase
      .from("command_audit")
      .select("id,result")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if (existing) {
      console.log("Idempotency hit for key:", idempotency_key);
      return json({ ok: true, reused: true, audit_id: existing.id, result: existing.result });
    }

    let savedIds: string[] = [];
    let result: Record<string, unknown> = {};

    // Validate and execute
    if (command === "add_daily_log") {
      const payload = AddDailyLog.parse(parsed.data.payload);
      const { data, error } = await supabase.from("daily_logs")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (daily_logs):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "daily_logs", count: savedIds.length };
    }

    if (command === "add_finance") {
      const payload = AddFinance.parse(parsed.data.payload);
      const { data, error } = await supabase.from("finance_entries")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (finance_entries):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "finance_entries", count: savedIds.length };
    }

    if (command === "add_sale") {
      const payload = AddSale.parse(parsed.data.payload);
      const { data, error } = await supabase.from("sales")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (sales):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "sales", count: savedIds.length };
    }

    if (command === "set_alarm") {
      const payload = SetAlarm.parse(parsed.data.payload);
      const { data, error } = await supabase.from("notifications")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (notifications):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "notifications", count: savedIds.length };
    }

    if (command === "add_project") {
      const payload = AddProject.parse(parsed.data.payload);
      const { data, error } = await supabase.from("projects")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (projects):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "projects", count: savedIds.length };
    }

    if (command === "add_task") {
      const payload = AddTask.parse(parsed.data.payload);
      const { data, error } = await supabase.from("tasks")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (tasks):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "tasks", count: savedIds.length };
    }

    if (command === "move_task") {
      const payload = MoveTask.parse(parsed.data.payload);
      const { data, error } = await supabase.from("tasks")
        .update({ status: payload.to_status, order_pos: payload.new_order_pos })
        .eq("id", payload.task_id)
        .eq("owner_id", user.id)
        .select("id");
      if (error) {
        console.error("DB error (move_task):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "tasks", action: "moved", count: savedIds.length };
    }

    if (command === "set_task_status") {
      const payload = SetTaskStatus.parse(parsed.data.payload);
      const { data, error } = await supabase.from("tasks")
        .update({ status: payload.status })
        .eq("id", payload.task_id)
        .eq("owner_id", user.id)
        .select("id");
      if (error) {
        console.error("DB error (set_task_status):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "tasks", action: "status_updated", count: savedIds.length };
    }

    // Audit
    const { data: audit, error: auditErr } = await supabase.from("command_audit")
      .insert({
        owner_id: user.id,
        command_type: command,
        idempotency_key,
        payload: parsed.data.payload as Record<string, unknown>,
        result
      }).select("id").single();
    if (auditErr) {
      console.error("Audit error:", auditErr);
      throw auditErr;
    }

    console.log("Command executed successfully:", command, "audit_id:", audit.id);
    return json({ ok: true, saved_ids: savedIds, audit_id: audit.id, result });
  } catch (e) {
    console.error("Server error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors },
  });
}
