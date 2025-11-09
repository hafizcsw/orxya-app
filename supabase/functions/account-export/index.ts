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
    const jwt = req.headers.get("Authorization");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: jwt } }
      }
    );

    const { data: { user }, error: userError } = await supa.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Exporting data for user: ${user.id}`);

    const tables = [
      "profiles",
      "signals_daily",
      "signals_raw",
      "financial_events",
      "meals_log",
      "recommendations",
      "calendar_events_mirror",
      "events",
      "ai_calls_log",
      "ai_cache",
      "ai_messages",
      "ai_sessions",
      "health_samples",
      "location_samples",
      "business_plans",
      "conflicts",
      "notifications",
      "privacy_consents",
      "audit_log"
    ];

    const payload: Record<string, unknown> = {};
    
    for (const table of tables) {
      try {
        const { data, error } = await supa.from(table).select("*");
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          payload[table] = { error: String(error) };
        } else {
          payload[table] = data;
        }
      } catch (err) {
        console.error(`Exception fetching ${table}:`, err);
        payload[table] = { error: String(err) };
      }
    }

    // Log audit event
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    await admin.from("audit_log").insert({
      user_id: user.id,
      action: "DATA_EXPORT",
      table_name: "all",
      details: { tables_exported: tables.length }
    });

    const exportData = {
      exported_at: new Date().toISOString(),
      user_id: user.id,
      user_email: user.email,
      data: payload
    };

    console.log(`Successfully exported data for user: ${user.id}`);

    return new Response(JSON.stringify(exportData), {
      status: 200,
      headers: { 
        ...corsHeaders, 
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="oryxa-export-${user.id}-${Date.now()}.json"`
      }
    });

  } catch (error) {
    console.error("Error in account-export:", error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
