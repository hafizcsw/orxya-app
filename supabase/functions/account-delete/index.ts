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
    const userJwt = req.headers.get("Authorization");
    if (!userJwt) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: userJwt } }
      }
    );

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Deleting account for user: ${user.id}`);

    // Log audit event
    await admin.from("audit_log").insert({
      user_id: user.id,
      action: "ACCOUNT_DELETE_REQUEST",
      table_name: "auth.users",
      row_pk: user.id,
      details: { email: user.email }
    });

    // Delete user (cascades to all related data via ON DELETE CASCADE)
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message }), { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Successfully deleted account for user: ${user.id}`);

    return new Response(JSON.stringify({ 
      ok: true,
      message: "Account successfully deleted"
    }), { 
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error in account-delete:", error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
