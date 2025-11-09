import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAccessTokenForUser } from "../_shared/googleToken.ts";
import { corsHeaders } from "../_shared/cors.ts";

async function fetchEvents(
  accessToken: string,
  calendarId: string,
  params: Record<string, string>
) {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  );

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, calendar_id, full } = await req.json();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessToken = await getAccessTokenForUser(admin, user_id);

    // استرجاع sync_token السابق
    const { data: syncState } = await admin
      .from("calendar_sync_state")
      .select("*")
      .eq("user_id", user_id)
      .eq("provider", "google")
      .eq("calendar_id", calendar_id)
      .maybeSingle();

    let params: Record<string, string> = {
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "2500",
    };

    if (!syncState?.sync_token || full) {
      // مزامنة كاملة: آخر 30 يومًا
      const timeMin = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      params.timeMin = timeMin;
      params.orderBy = "startTime";
    } else {
      // مزامنة تفريقية
      params.syncToken = syncState.sync_token;
    }

    const upserts: any[] = [];
    let page: any = await fetchEvents(accessToken, calendar_id, params);

    const processPage = (p: any) => {
      for (const event of p.items ?? []) {
        if (!event.id) continue;

        const start = event.start?.dateTime ?? (event.start?.date ? `${event.start.date}T00:00:00Z` : null);
        const end = event.end?.dateTime ?? (event.end?.date ? `${event.end.date}T00:00:00Z` : null);
        const cancelled = event.status === "cancelled";

        if (!start || !end) continue;

        upserts.push({
          user_id,
          provider: "google",
          external_id: event.id,
          start_at: start,
          end_at: end,
          summary: event.summary ?? "بدون عنوان",
          meta: {
            description: event.description,
            location: event.location,
            status: event.status,
            cancelled,
          },
          updated_at: new Date().toISOString(),
        });
      }
    };

    processPage(page);

    // معالجة الصفحات التالية
    while (page.nextPageToken) {
      params.pageToken = page.nextPageToken;
      delete params.syncToken; // لا نستخدم syncToken مع pagination
      page = await fetchEvents(accessToken, calendar_id, params);
      processPage(page);
    }

    // حفظ في المرآة
    if (upserts.length > 0) {
      const { error: upsertError } = await admin
        .from("calendar_events_mirror")
        .upsert(upserts, {
          onConflict: "user_id,provider,external_id",
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }
    }

    // حفظ syncToken الجديد
    const newSyncToken = page.nextSyncToken;
    if (newSyncToken) {
      const { error: stateError } = await admin
        .from("calendar_sync_state")
        .upsert(
          {
            user_id,
            provider: "google",
            calendar_id,
            sync_token: newSyncToken,
            full_sync_done: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id,provider,calendar_id",
          }
        );

      if (stateError) {
        console.error("State update error:", stateError);
      }
    }

    console.log(`[calendar-sync] user=${user_id} calendar=${calendar_id} events=${upserts.length}`);

    return new Response(
      JSON.stringify({ ok: true, synced: upserts.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
