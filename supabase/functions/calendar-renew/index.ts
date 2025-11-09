import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // القنوات التي ستنتهي خلال 24 ساعة
    const nowPlus24h = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    const { data: expiring } = await admin
      .from("calendar_watch_channels")
      .select("*")
      .lt("expires_at", nowPlus24h)
      .is("stopped_at", null);

    console.log(`[calendar-renew] Found ${expiring?.length ?? 0} expiring channels`);

    if (!expiring || expiring.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, renewed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webhookBase = Deno.env.get("WEBHOOK_BASE") || Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "");
    const uniqueUsers = [...new Set(expiring.map(ch => ch.user_id))];
    let renewed = 0;

    for (const userId of uniqueUsers) {
      try {
        const userChannels = expiring.filter(ch => ch.user_id === userId);
        
        // إيقاف القنوات القديمة عبر Google API
        for (const ch of userChannels) {
          try {
            // استدعاء دالة stop_calendar_watch
            const { data: stopResult } = await admin.rpc('stop_calendar_watch', {
              p_user_id: userId,
              p_calendar_id: ch.calendar_id
            });

            if (stopResult?.success) {
              console.log(`[calendar-renew] Stopped channel ${ch.channel_id} for user ${userId}`);
              
              // إيقاف القناة عبر Google API
              const { data: accounts } = await admin
                .from('external_accounts')
                .select('access_token')
                .eq('user_id', userId)
                .eq('provider', 'google')
                .maybeSingle();

              if (accounts?.access_token) {
                await fetch('https://www.googleapis.com/calendar/v3/channels/stop', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accounts.access_token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    id: stopResult.channel_id,
                    resourceId: stopResult.resource_id
                  })
                });
              }
            }
          } catch (stopError) {
            console.error(`[calendar-renew] Error stopping channel ${ch.channel_id}:`, stopError);
          }
        }

        // إعادة إنشاء watches جديدة
        const setupRes = await fetch(`${webhookBase}/functions/v1/calendar-watch-setup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ user_id: userId }),
        });

        if (setupRes.ok) {
          renewed++;
          console.log(`[calendar-renew] ✅ Renewed watches for user ${userId}`);
        } else {
          console.error(`[calendar-renew] ❌ Failed to renew for user ${userId}:`, await setupRes.text());
        }
      } catch (userError) {
        console.error(`[calendar-renew] Error renewing for user ${userId}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        renewed,
        total_expiring: uniqueUsers.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[calendar-renew] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
