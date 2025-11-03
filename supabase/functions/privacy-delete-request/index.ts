// Epic 9: Privacy Delete Request - Soft delete user data
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "no_auth" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "bad_user" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // 1) Immediately disable all data collection
    const { error: prefsError } = await supabase
      .from("user_privacy_prefs")
      .upsert({
        user_id: user.id,
        health_enabled: false,
        calendar_enabled: false,
        notif_fin_enabled: false,
        location_enabled: false,
        pause_all: true,
        updated_at: new Date().toISOString()
      });

    if (prefsError) {
      console.error("Failed to update prefs:", prefsError);
    }

    // 2) Log delete request (soft delete marker)
    const { error: auditError } = await supabase
      .from("privacy_audit")
      .insert({
        user_id: user.id,
        action: "request_delete",
        meta: { 
          requested_at: new Date().toISOString(),
          note: "Soft delete requested - actual deletion pending compliance review"
        }
      });

    if (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    // 3) Optional: Mark events/data for deletion (add deleted_at timestamp)
    // This allows for compliance review before permanent deletion
    const tables = ["events", "health_samples", "financial_events", "location_samples"];
    for (const table of tables) {
      try {
        // Only if the table has a deleted_at column
        await supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .is("deleted_at", null);
      } catch (e) {
        console.warn(`Soft delete failed for ${table}:`, e);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "Delete request received. All data collection stopped immediately. Permanent deletion will occur after compliance review period (30 days).",
        status: "soft_delete_requested"
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Delete request error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
