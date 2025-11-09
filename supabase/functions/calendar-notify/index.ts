import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const headers = req.headers;
    const channelId = headers.get("X-Goog-Channel-Id");
    const resourceId = headers.get("X-Goog-Resource-Id");
    const state = headers.get("X-Goog-Resource-State");

    console.log("[calendar-notify] channel=", channelId, "state=", state);

    if (!channelId || !resourceId) {
      return new Response("ok", { status: 200 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: watch } = await admin
      .from("calendar_watch_channels")
      .select("*")
      .eq("channel_id", channelId)
      .eq("resource_id", resourceId)
      .maybeSingle();

    if (!watch) {
      console.log("[calendar-notify] Unknown channel");
      return new Response("ok", { status: 200 });
    }

    // تشغيل مزامنة تفريقية
    const webhookBase = Deno.env.get("WEBHOOK_BASE") || Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "");
    
    await fetch(`${webhookBase}/functions/v1/calendar-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
      },
      body: JSON.stringify({
        user_id: watch.user_id,
        calendar_id: watch.calendar_id,
        full: false,
      }),
    });

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("[calendar-notify] Error:", error);
    // Google يتوقع 2xx حتى لا يوقف القناة
    return new Response("ok", { status: 200 });
  }
});
