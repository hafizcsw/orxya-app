import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } }
    );

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response("Invalid user", { status: 401 });

    // Check flag
    const { data: flags } = await sb.rpc('get_user_flags', { p_user_id: user.id });
    if (!flags?.ff_calendar_google_sync) {
      return new Response(JSON.stringify({ message: 'Google sync disabled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[calendar-sync-google] Starting sync for user: ${user.id}`);

    // Get Google account
    const { data: account } = await sb.from('external_accounts')
      .select('*')
      .eq('owner_id', user.id)
      .eq('provider', 'google')
      .single();

    if (!account || !account.access_token) {
      console.warn(`[calendar-sync-google] No Google account found for user ${user.id}`);
      return new Response(JSON.stringify({ error: 'No Google account connected' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get sync state
    let { data: syncState } = await sb.from('calendar_sync_state')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Initialize if not exists
    if (!syncState) {
      const { data: created } = await sb.from('calendar_sync_state')
        .insert({
          user_id: user.id,
          provider: 'google',
          sync_status: 'idle'
        })
        .select()
        .single();
      syncState = created;
    }

    // Update status to syncing
    await sb.from('calendar_sync_state')
      .update({ sync_status: 'syncing', last_error: null })
      .eq('user_id', user.id);

    // Build Google Calendar API request
    let url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const params = new URLSearchParams({
      maxResults: '250',
      singleEvents: 'true',
      timeMin: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(), // last 90 days
      timeMax: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString() // next 180 days
    });

    // Use syncToken for delta sync if available
    if (syncState?.sync_token) {
      params.set('syncToken', syncState.sync_token);
      params.delete('timeMin');
      params.delete('timeMax');
      console.log(`[calendar-sync-google] Using syncToken for delta sync`);
    }

    url += '?' + params.toString();

    // Fetch from Google
    const googleResp = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${account.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!googleResp.ok) {
      const errorText = await googleResp.text();
      console.error(`[calendar-sync-google] Google API error: ${googleResp.status} ${errorText}`);
      
      // Handle 410 Gone (syncToken invalidated)
      if (googleResp.status === 410) {
        console.log(`[calendar-sync-google] SyncToken invalidated, full sync needed`);
        await sb.from('calendar_sync_state')
          .update({ sync_token: null })
          .eq('user_id', user.id);
        
        return new Response(JSON.stringify({
          message: 'SyncToken invalidated, please retry for full sync'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Handle 401 (token expired - needs refresh)
      if (googleResp.status === 401) {
        console.log(`[calendar-sync-google] Token expired, needs refresh`);
        await sb.from('calendar_sync_state')
          .update({ 
            sync_status: 'error',
            last_error: 'Token expired'
          })
          .eq('user_id', user.id);
        
        return new Response(JSON.stringify({
          error: 'Token expired, please reconnect Google account'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      throw new Error(`Google API error: ${googleResp.status}`);
    }

    const googleData = await googleResp.json();
    const events = googleData.items || [];
    const nextSyncToken = googleData.nextSyncToken;

    console.log(`[calendar-sync-google] Fetched ${events.length} events`);

    // Process and upsert events
    let inserted = 0, updated = 0, deleted = 0;

    for (const gEvent of events) {
      try {
        // Skip cancelled events (soft delete)
        if (gEvent.status === 'cancelled') {
          await sb.from('events')
            .update({
              status: 'cancelled',
              deleted_at: new Date().toISOString()
            })
            .eq('external_id', gEvent.id)
            .eq('provider', 'google')
            .eq('owner_id', user.id);
          deleted++;
          continue;
        }

        // Convert Google event to our format
        const ourEvent = convertGoogleToOurFormat(gEvent, user.id);

        // Upsert
        const { data: existing } = await sb.from('events')
          .select('id')
          .eq('external_id', gEvent.id)
          .eq('provider', 'google')
          .eq('owner_id', user.id)
          .maybeSingle();

        if (existing) {
          await sb.from('events')
            .update(ourEvent)
            .eq('id', existing.id);
          updated++;
        } else {
          await sb.from('events')
            .insert(ourEvent);
          inserted++;
        }
      } catch (eventErr) {
        console.error(`[calendar-sync-google] Error processing event ${gEvent.id}:`, eventErr);
      }
    }

    // Update sync state
    await sb.from('calendar_sync_state')
      .update({
        sync_token: nextSyncToken,
        sync_status: 'idle',
        last_sync_at: new Date().toISOString(),
        next_sync_after: new Date(Date.now() + 2 * 3600 * 1000).toISOString() // next sync in 2 hours
      })
      .eq('user_id', user.id);

    console.log(`[calendar-sync-google] Sync complete: ${inserted} inserted, ${updated} updated, ${deleted} deleted`);

    return new Response(JSON.stringify({
      success: true,
      stats: { inserted, updated, deleted, total: events.length },
      nextSyncToken
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[calendar-sync-google] Error:', error);
    
    // Update sync state with error
    try {
      const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (jwt) {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: `Bearer ${jwt}` } } }
        );
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from('calendar_sync_state')
            .update({
              sync_status: 'error',
              last_error: error instanceof Error ? error.message : 'Unknown error'
            })
            .eq('user_id', user.id);
        }
      }
    } catch {}

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Convert Google Calendar event to our format
function convertGoogleToOurFormat(gEvent: any, userId: string) {
  return {
    owner_id: userId,
    provider: 'google',
    external_id: gEvent.id,
    external_etag: gEvent.etag,
    source: 'external',
    title: gEvent.summary || '(No title)',
    description: gEvent.description,
    location: gEvent.location,
    starts_at: gEvent.start.dateTime || gEvent.start.date,
    ends_at: gEvent.end.dateTime || gEvent.end.date,
    timezone: gEvent.start.timeZone || 'Asia/Dubai',
    is_all_day: !!gEvent.start.date,
    status: gEvent.status || 'confirmed',
    visibility: gEvent.visibility || 'default',
    transparency: gEvent.transparency || 'opaque',
    busy_state: gEvent.transparency === 'transparent' ? 'free' : 'busy',
    color: mapGoogleColorToOur(gEvent.colorId),
    conference_url: gEvent.hangoutLink || gEvent.conferenceData?.entryPoints?.[0]?.uri,
    conference_data: gEvent.conferenceData ? {
      type: gEvent.conferenceData.conferenceSolution?.name || 'google_meet',
      url: gEvent.conferenceData.entryPoints?.[0]?.uri,
      id: gEvent.conferenceData.conferenceId
    } : null,
    attendees: gEvent.attendees ? gEvent.attendees.map((a: any) => ({
      email: a.email,
      name: a.displayName || a.email,
      response: a.responseStatus || 'needsAction',
      organizer: a.organizer || false,
      optional: a.optional || false
    })) : [],
    reminders: gEvent.reminders?.overrides ? gEvent.reminders.overrides.map((r: any) => ({
      minutes: r.minutes,
      method: r.method || 'popup'
    })) : [],
    recurrence: gEvent.recurrence ? {
      rrule: gEvent.recurrence.find((r: string) => r.startsWith('RRULE:')) || '',
      exdates: gEvent.recurrence
        .filter((r: string) => r.startsWith('EXDATE:'))
        .map((r: string) => r.replace('EXDATE:', ''))
    } : null,
    organizer: gEvent.organizer ? {
      email: gEvent.organizer.email,
      name: gEvent.organizer.displayName || gEvent.organizer.email,
      self: gEvent.organizer.self || false
    } : null,
    sequence: gEvent.sequence || 0,
    kind: detectEventKind(gEvent),
    created_at: gEvent.created,
    updated_at: gEvent.updated
  };
}

function detectEventKind(gEvent: any): string {
  if (gEvent.conferenceData || gEvent.hangoutLink) return 'meeting';
  if (gEvent.description?.toLowerCase().includes('prayer')) return 'prayer';
  if (gEvent.description?.toLowerCase().includes('focus')) return 'focus';
  return 'event';
}

function mapGoogleColorToOur(colorId?: string): string | null {
  if (!colorId) return null;
  
  const colorMap: Record<string, string> = {
    '1': 'lavender',
    '2': 'sage',
    '3': 'grape',
    '4': 'flamingo',
    '5': 'banana',
    '6': 'tangerine',
    '7': 'peacock',
    '8': 'graphite',
    '9': 'blueberry',
    '10': 'basil',
    '11': 'tomato'
  };
  
  return colorMap[colorId] || null;
}
