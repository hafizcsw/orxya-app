import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "content-type": "application/json; charset=utf-8",
};

function todayDubaiISODate(): string {
  // Dubai is UTC+4 year-round (no DST)
  const now = new Date();
  const dubai = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return dubai.toISOString().slice(0, 10); // YYYY-MM-DD
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: { ...cors } });
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const reportDate = body.date || todayDubaiISODate();
    const period = body.period || 'daily'; // daily, weekly, monthly, yearly

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }, // keep RLS
    });

    // Ensure authenticated user (RLS context)
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    // Get or create user's profile
    let { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("initial_balance_usd")
      .eq("id", user.id)
      .maybeSingle();
    
    // Create profile if doesn't exist
    if (!profile) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ id: user.id, initial_balance_usd: 0 });
      
      if (insertErr) console.error("Failed to create profile:", insertErr);
      else profile = { initial_balance_usd: 0 };
    }
    
    const current_balance = Number(profile?.initial_balance_usd) || 0;

    console.log("Generating report for:", reportDate, "user:", user.id, "balance:", current_balance);

    // --- Get daily_logs for the date ---
    const { data: logRow, error: logErr } = await supabase
      .from("daily_logs")
      .select("work_hours, study_hours, mma_hours, walk_min, income_usd, spend_usd, scholarships_sold, villas_sold")
      .eq("log_date", reportDate)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (logErr) throw logErr;

    const work_hours = Number(logRow?.work_hours) || 0;
    const study_hours = Number(logRow?.study_hours) || 0;
    const mma_hours = Number(logRow?.mma_hours) || 0;
    const walk_min = Number(logRow?.walk_min) || 0;
    const income_usd = Number(logRow?.income_usd) || 0;
    const spend_usd = Number(logRow?.spend_usd) || 0;
    const scholarships_sold = Number(logRow?.scholarships_sold) || 0;
    const villas_sold = Number(logRow?.villas_sold) || 0;
    const net_usd = income_usd - spend_usd;

    // --- Get totals from daily_logs (for tracking only) ---
    const { data: allDailyLogs, error: allLogsErr } = await supabase
      .from("daily_logs")
      .select("income_usd, spend_usd")
      .eq("owner_id", user.id);
    if (allLogsErr) throw allLogsErr;

    let total_income = 0, total_spend = 0;
    for (const r of allDailyLogs ?? []) {
      total_income += Number(r.income_usd) || 0;
      total_spend += Number(r.spend_usd) || 0;
    }

    // --- Get period data based on period type ---
    let periodData: any = {};
    const currentDate = new Date(reportDate);
    
    if (period === 'weekly') {
      // Get last 7 days
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() - 6);
      
      const { data: weekLogs } = await supabase
        .from("daily_logs")
        .select("log_date, income_usd, spend_usd, work_hours, study_hours, mma_hours, walk_min")
        .eq("owner_id", user.id)
        .gte("log_date", weekStart.toISOString().slice(0, 10))
        .lte("log_date", reportDate)
        .order("log_date");
      
      periodData = { type: 'weekly', data: weekLogs || [] };
    } else if (period === 'monthly') {
      // Get current month
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      
      const { data: monthLogs } = await supabase
        .from("daily_logs")
        .select("log_date, income_usd, spend_usd, work_hours, study_hours, mma_hours, walk_min")
        .eq("owner_id", user.id)
        .gte("log_date", monthStart.toISOString().slice(0, 10))
        .lte("log_date", reportDate)
        .order("log_date");
      
      periodData = { type: 'monthly', data: monthLogs || [] };
    } else if (period === 'yearly') {
      // Get current year
      const yearStart = new Date(currentDate.getFullYear(), 0, 1);
      
      const { data: yearLogs } = await supabase
        .from("daily_logs")
        .select("log_date, income_usd, spend_usd, work_hours, study_hours, mma_hours, walk_min")
        .eq("owner_id", user.id)
        .gte("log_date", yearStart.toISOString().slice(0, 10))
        .lte("log_date", reportDate)
        .order("log_date");
      
      periodData = { type: 'yearly', data: yearLogs || [] };
    }

    const report = {
      date: reportDate,
      period,
      income_usd, spend_usd, net_usd,
      study_hours, mma_hours, work_hours, walk_min,
      scholarships_sold, villas_sold,
      total_income, total_spend, 
      current_balance,
      periodData
    };

    console.log("Report generated:", report);
    return json({ ok: true, report });
  } catch (e) {
    console.error("report-daily error:", e);
    return json({ ok: false, error: "SERVER_ERROR", details: String(e) }, 500);
  }
});
