import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configure alert thresholds
const THRESHOLDS = {
  ERROR_RATE_PERCENT: 5,
  AI_QUOTA_USAGE_PERCENT: 80,
  DAILY_COST_USD: 10,
  RESPONSE_TIME_MS: 2000,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const alerts: any[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    // 1) Check error rate in last hour
    const { data: recentCalls } = await admin.from("ai_calls_log")
      .select("*")
      .gte("created_at", oneHourAgo.toISOString());

    if (recentCalls && recentCalls.length > 10) {
      const errors = recentCalls.filter((c: any) => c.route?.includes("error"));
      const errorRate = (errors.length / recentCalls.length) * 100;
      
      if (errorRate > THRESHOLDS.ERROR_RATE_PERCENT) {
        alerts.push({
          severity: "error",
          type: "high_error_rate",
          message: `Error rate at ${errorRate.toFixed(1)}% (threshold: ${THRESHOLDS.ERROR_RATE_PERCENT}%)`,
          value: errorRate,
          threshold: THRESHOLDS.ERROR_RATE_PERCENT,
          details: { total_calls: recentCalls.length, errors: errors.length }
        });
      }
    }

    // 2) Check AI quota usage
    const { data: quotaData } = await admin.from("ai_quota")
      .select("daily_calls_used, daily_calls_limit")
      .order("daily_calls_used", { ascending: false })
      .limit(5);

    if (quotaData && quotaData.length > 0) {
      const highUsage = quotaData.filter((q: any) => 
        (q.daily_calls_used / q.daily_calls_limit) * 100 > THRESHOLDS.AI_QUOTA_USAGE_PERCENT
      );
      
      if (highUsage.length > 0) {
        alerts.push({
          severity: "warning",
          type: "high_quota_usage",
          message: `${highUsage.length} users above ${THRESHOLDS.AI_QUOTA_USAGE_PERCENT}% quota`,
          value: highUsage.length,
          threshold: THRESHOLDS.AI_QUOTA_USAGE_PERCENT,
          details: highUsage.map((q: any) => ({
            used: q.daily_calls_used,
            limit: q.daily_calls_limit,
            percent: Math.round((q.daily_calls_used / q.daily_calls_limit) * 100)
          }))
        });
      }
    }

    // 3) Check daily cost
    const { data: costData } = await admin.from("ai_calls_log")
      .select("cost_usd")
      .gte("created_at", oneDayAgo.toISOString());

    if (costData && costData.length > 0) {
      const totalCost = costData.reduce((sum: number, c: any) => sum + (Number(c.cost_usd) || 0), 0);
      
      if (totalCost > THRESHOLDS.DAILY_COST_USD) {
        alerts.push({
          severity: "error",
          type: "high_daily_cost",
          message: `Daily AI cost at $${totalCost.toFixed(2)} (threshold: $${THRESHOLDS.DAILY_COST_USD})`,
          value: totalCost,
          threshold: THRESHOLDS.DAILY_COST_USD,
          details: { calls_count: costData.length, average_cost: totalCost / costData.length }
        });
      }
    }

    // 4) Check response times
    const { data: latencyData } = await admin.from("ai_calls_log")
      .select("latency_ms")
      .gte("created_at", oneHourAgo.toISOString())
      .not("latency_ms", "is", null);

    if (latencyData && latencyData.length > 10) {
      const sortedLatencies = latencyData.map((l: any) => l.latency_ms).sort((a: number, b: number) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95 = sortedLatencies[p95Index];
      
      if (p95 > THRESHOLDS.RESPONSE_TIME_MS) {
        alerts.push({
          severity: "warning",
          type: "slow_response_time",
          message: `P95 latency at ${p95}ms (threshold: ${THRESHOLDS.RESPONSE_TIME_MS}ms)`,
          value: p95,
          threshold: THRESHOLDS.RESPONSE_TIME_MS,
          details: { 
            p50: sortedLatencies[Math.floor(sortedLatencies.length * 0.5)],
            p95,
            p99: sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
          }
        });
      }
    }

    // Send alerts to webhook if configured
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (alerts.length > 0 && webhookUrl) {
      const criticalAlerts = alerts.filter((a: any) => a.severity === "error");
      const warningAlerts = alerts.filter((a: any) => a.severity === "warning");
      
      const slackMessage = {
        text: `🚨 Oryxa Alerts: ${criticalAlerts.length} critical, ${warningAlerts.length} warnings`,
        blocks: [
          {
            type: "header",
            text: { type: "plain_text", text: "Oryxa System Alerts" }
          },
          ...alerts.map((alert: any) => ({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${alert.severity === "error" ? "🔴" : "⚠️"} *${alert.type}*\n${alert.message}`
            }
          }))
        ]
      };

      try {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slackMessage)
        });
      } catch (err) {
        console.error("Failed to send Slack alert:", err);
      }
    }

    return new Response(JSON.stringify({
      ok: alerts.length === 0,
      timestamp: now.toISOString(),
      alerts_count: alerts.length,
      critical: alerts.filter((a: any) => a.severity === "error").length,
      warnings: alerts.filter((a: any) => a.severity === "warning").length,
      alerts
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Ops alert error:", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
