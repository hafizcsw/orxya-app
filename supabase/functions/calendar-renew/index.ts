import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async () => {
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
      .lt("expires_at", nowPlus24h);

    console.log(`[calendar-renew] Found ${expiring?.length ?? 0} expiring channels`);

    if (!expiring || expiring.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, renewed: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const webhookBase = Deno.env.get("WEBHOOK_BASE") || Deno.env.get("SUPABASE_URL")!.replace("/rest/v1", "");
    const uniqueUsers = [...new Set(expiring.map(ch => ch.user_id))];

    for (const userId of uniqueUsers) {
      try {
        // حذف القنوات القديمة للمستخدم
        await admin
          .from("calendar_watch_channels")
          .delete()
          .eq("user_id", userId);

        // إعادة إنشاء watches
        await fetch(`${webhookBase}/functions/v1/calendar-watch-setup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}`,
          },
          body: JSON.stringify({ user_id: userId }),
        });

        console.log(`[calendar-renew] Renewed watches for user ${userId}`);
      } catch (userError) {
        console.error(`[calendar-renew] Error renewing for user ${userId}:`, userError);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, renewed: uniqueUsers.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[calendar-renew] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
