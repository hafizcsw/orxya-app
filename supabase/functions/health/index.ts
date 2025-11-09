import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const checks: Record<string, any> = {
      timestamp: new Date().toISOString(),
      version: Deno.env.get("APP_VERSION") || "1.0.0",
      ok: true,
      checks: {}
    };

    // 1) Database connectivity
    try {
      const { data, error } = await admin.from("profiles").select("count").limit(1).single();
      checks.checks.database = error ? { status: "error", error: error.message } : { status: "ok" };
    } catch (err) {
      checks.checks.database = { status: "error", error: String(err) };
      checks.ok = false;
    }

    // 2) Feature flags
    try {
      const { data } = await admin.from("feature_flags").select("*");
      checks.checks.feature_flags = { 
        status: "ok", 
        count: data?.length || 0,
        flags: data?.reduce((acc: any, f: any) => ({ ...acc, [f.key]: f.enabled }), {})
      };
    } catch (err) {
      checks.checks.feature_flags = { status: "error", error: String(err) };
    }

    // 3) AI quota status
    try {
      const { data } = await admin.from("ai_quota")
        .select("daily_calls_used, daily_calls_limit")
        .order("daily_calls_used", { ascending: false })
        .limit(1)
        .single();
      
      const usage = data ? (data.daily_calls_used / data.daily_calls_limit) * 100 : 0;
      checks.checks.ai_quota = { 
        status: usage > 90 ? "warning" : "ok",
        max_usage_percent: Math.round(usage),
        calls_used: data?.daily_calls_used || 0,
        calls_limit: data?.daily_calls_limit || 0
      };
    } catch (err) {
      checks.checks.ai_quota = { status: "error", error: String(err) };
    }

    // 4) Recent errors
    try {
      const { data } = await admin.from("ai_calls_log")
        .select("*")
        .gte("created_at", new Date(Date.now() - 3600000).toISOString()) // Last hour
        .limit(100);
      
      const errors = data?.filter((log: any) => log.route?.includes("error")) || [];
      const errorRate = data && data.length > 0 ? (errors.length / data.length) * 100 : 0;
      
      checks.checks.error_rate = {
        status: errorRate > 5 ? "error" : errorRate > 2 ? "warning" : "ok",
        error_rate_percent: Math.round(errorRate * 100) / 100,
        total_calls_1h: data?.length || 0,
        errors_1h: errors.length
      };
    } catch (err) {
      checks.checks.error_rate = { status: "error", error: String(err) };
    }

    // 5) External accounts (OAuth health)
    try {
      const { data } = await admin.from("external_accounts")
        .select("provider, status")
        .eq("status", "connected");
      
      checks.checks.oauth_connections = {
        status: "ok",
        active_connections: data?.length || 0,
        by_provider: data?.reduce((acc: any, conn: any) => {
          acc[conn.provider] = (acc[conn.provider] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (err) {
      checks.checks.oauth_connections = { status: "error", error: String(err) };
    }

    // Determine overall status
    const hasErrors = Object.values(checks.checks).some((c: any) => c.status === "error");
    const hasWarnings = Object.values(checks.checks).some((c: any) => c.status === "warning");
    
    checks.ok = !hasErrors;
    checks.status = hasErrors ? "unhealthy" : hasWarnings ? "degraded" : "healthy";

    return new Response(JSON.stringify(checks), {
      status: checks.ok ? 200 : 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Health check error:", error);
    return new Response(JSON.stringify({ 
      ok: false, 
      status: "unhealthy",
      error: String(error) 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
