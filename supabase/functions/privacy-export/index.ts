// Epic 9: Privacy Export - Generate user data export
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
    const key = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(url, key, { 
      global: { headers: { Authorization: `Bearer ${jwt}` } } 
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "bad_user" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Collect user data from all tables
    const tables = ["health_samples", "financial_events", "events", "location_samples", "conflicts", "user_privacy_prefs"];
    const dump: Record<string, any> = {
      user_id: user.id,
      email: user.email,
      exported_at: new Date().toISOString(),
      data: {} as Record<string, any>
    };

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("user_id", user.id)
          .limit(10000);
        
        if (!error && data) {
          dump.data[table] = data;
        }
      } catch (e) {
        console.warn(`Failed to export ${table}:`, e);
        dump.data[table] = { error: String(e) };
      }
    }

    // Store as JSON in Storage bucket with 24h expiry
    const fileName = `exports/${user.id}/export_${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    
    const { error: uploadError } = await supabase.storage
      .from("privacy")
      .upload(fileName, blob, { upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Create signed URL (24 hours)
    const { data: urlData } = await supabase.storage
      .from("privacy")
      .createSignedUrl(fileName, 86400);

    // Log audit
    await supabase.from("privacy_audit").insert({
      user_id: user.id,
      action: "export",
      meta: { file: fileName, tables: tables.length }
    });

    return new Response(
      JSON.stringify({ 
        ok: true, 
        url: urlData?.signedUrl,
        expires_in: "24 hours"
      }), 
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
