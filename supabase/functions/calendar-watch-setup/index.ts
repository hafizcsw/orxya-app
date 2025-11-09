import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessTokenForUser, listGoogleCalendars } from "../_shared/googleToken.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessToken = await getAccessTokenForUser(admin, user_id);
    const calendars = await listGoogleCalendars(accessToken);

    const webhookBase = Deno.env.get("WEBHOOK_BASE") || Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "");
    const ttl = Number(Deno.env.get("WATCH_TTL_SECONDS") ?? "604800"); // 7 أيام

    let setupCount = 0;

    for (const calendarId of calendars) {
      try {
        const channelId = crypto.randomUUID();

        // إعداد Watch
        const watchResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events/watch`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id: channelId,
              type: "web_hook",
              address: `${webhookBase}/functions/v1/calendar-notify`,
              params: { ttl: String(ttl) },
            }),
          }
        );

        if (!watchResponse.ok) {
          console.error(`Failed to setup watch for ${calendarId}:`, await watchResponse.text());
          continue;
        }

        const watchData = await watchResponse.json();
        const expiresAt = watchData.expiration
          ? new Date(Number(watchData.expiration)).toISOString()
          : new Date(Date.now() + ttl * 1000).toISOString();

        // حفظ معلومات القناة
        await admin.from("calendar_watch_channels").upsert({
          channel_id: channelId,
          user_id,
          provider: "google",
          calendar_id: calendarId,
          resource_id: watchData.resourceId,
          expires_at: expiresAt,
        });

        // مزامنة كاملة أولية
        await fetch(`${webhookBase}/functions/v1/calendar-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({
            user_id,
            calendar_id: calendarId,
            full: true,
          }),
        });

        setupCount++;
      } catch (calError) {
        console.error(`Error setting up calendar ${calendarId}:`, calError);
      }
    }

    console.log(`[calendar-watch-setup] user=${user_id} calendars=${setupCount}`);

    return new Response(
      JSON.stringify({ ok: true, calendars: setupCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Watch setup error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
