import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AddDailyLog = z.object({
  log_date: z.string(),
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
  time_local: z.string(),
  rrule: z.string().optional()
});

const BodySchema = z.object({
  command: z.enum(["add_daily_log", "add_finance", "add_sale", "set_alarm"]),
  idempotency_key: z.string().min(8),
  payload: z.any()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      console.error("Validation error:", parsed.error.flatten());
      return new Response(
        JSON.stringify({ ok: false, error: "INVALID_BODY", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      console.error("Auth error:", userErr);
      return new Response(
        JSON.stringify({ ok: false, error: "UNAUTHENTICATED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check idempotency
    const { data: existing } = await supabase
      .from("command_audit")
      .select("id,result")
      .eq("idempotency_key", parsed.data.idempotency_key)
      .maybeSingle();

    if (existing) {
      console.log("Idempotency hit:", existing.id);
      return new Response(
        JSON.stringify({ ok: true, reused: true, audit_id: existing.id, result: existing.result }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let savedIds: string[] = [];
    let result: any = null;

    if (parsed.data.command === "add_daily_log") {
      const payload = AddDailyLog.parse(parsed.data.payload);
      const { data, error } = await supabase
        .from("daily_logs")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (daily_logs):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "daily_logs", count: savedIds.length };
    }

    if (parsed.data.command === "add_finance") {
      const payload = AddFinance.parse(parsed.data.payload);
      const { data, error } = await supabase
        .from("finance_entries")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (finance_entries):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "finance_entries", count: savedIds.length };
    }

    if (parsed.data.command === "add_sale") {
      const payload = AddSale.parse(parsed.data.payload);
      const { data, error } = await supabase
        .from("sales")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (sales):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "sales", count: savedIds.length };
    }

    if (parsed.data.command === "set_alarm") {
      const payload = SetAlarm.parse(parsed.data.payload);
      const { data, error } = await supabase
        .from("notifications")
        .insert({ ...payload, owner_id: user.id })
        .select("id");
      if (error) {
        console.error("DB error (notifications):", error);
        throw error;
      }
      savedIds = data?.map(d => d.id) ?? [];
      result = { table: "notifications", count: savedIds.length };
    }

    const { data: auditRow, error: auditErr } = await supabase
      .from("command_audit")
      .insert({
        owner_id: user.id,
        command_type: parsed.data.command,
        idempotency_key: parsed.data.idempotency_key,
        payload: parsed.data.payload,
        result
      })
      .select("id")
      .single();

    if (auditErr) {
      console.error("Audit error:", auditErr);
      throw auditErr;
    }

    console.log("Command executed:", parsed.data.command, "audit:", auditRow.id);
    return new Response(
      JSON.stringify({ ok: true, saved_ids: savedIds, audit_id: auditRow.id, result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error("Server error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: "SERVER_ERROR", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
