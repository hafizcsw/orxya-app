import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Suggestion = {
  action: "move_event" | "shorten_event" | "cancel_event";
  new_start?: string;
  new_end?: string;
  shift_minutes?: number;
  notify_participants?: boolean;
  message_to_participants?: string | null;
  reasoning?: string;
  confidence?: number;
  alternatives?: Array<{
    action: string;
    new_start?: string;
    new_end?: string;
    shift_minutes?: number;
    reasoning?: string;
    confidence?: number;
  }>;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json().catch(() => ({}));
    const conflictId = String(body.conflict_id ?? '');
    if (!conflictId) {
      return new Response(JSON.stringify({ ok: false, error: 'BAD_INPUT' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 1) Fetch conflict
    const { data: conflict, error: conflictError } = await supabase
      .from('conflicts')
      .select('*')
      .eq('id', conflictId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (conflictError || !conflict) {
      return new Response(JSON.stringify({ ok: false, error: 'CONFLICT_NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2) Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, description, starts_at, ends_at, tags')
      .eq('id', conflict.event_id)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (eventError || !event) {
      return new Response(JSON.stringify({ ok: false, error: 'EVENT_NOT_FOUND' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 3) Get profile timezone
    const { data: profile } = await supabase
      .from('profiles')
      .select('timezone, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const tz = profile?.timezone ?? 'Asia/Dubai';

    // 4) Get prayer times for the day
    const dateISO = conflict.date_iso;
    const { data: prayerTimes } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('owner_id', user.id)
      .eq('date_iso', dateISO)
      .maybeSingle();

    // 5) Build AI prompt
    const systemPrompt = `أنت مساعد جدولة ذكي متخصص في حل تعارضات المواعيد مع أوقات الصلاة.
مهمتك: اقتراح أفضل حل لتعديل الحدث بأقل تأثير مع احترام أوقات الصلاة.

قواعد:
- احترم أوقات الصلاة ولا تضع أحداثاً خلالها
- اقترح تعديلات بسيطة (تحريك بسيط أفضل من إلغاء)
- احسب الوقت بدقة
- اقترح بدائل متعددة إن أمكن

أعد JSON فقط بهذا الشكل:
{
  "action": "move_event" | "shorten_event" | "cancel_event",
  "new_start": "ISO timestamp" (if applicable),
  "new_end": "ISO timestamp" (if applicable),
  "shift_minutes": number (if move_event),
  "reasoning": "شرح مختصر بالعربية",
  "confidence": 0.0-1.0,
  "notify_participants": true/false,
  "message_to_participants": "رسالة مقترحة للمشاركين",
  "alternatives": [{"action": "...", "reasoning": "...", ...}]
}`;

    const userPrompt = JSON.stringify({
      timezone: tz,
      user_name: profile?.full_name ?? 'المستخدم',
      conflict: {
        prayer_name: conflict.prayer_name,
        prayer_start: conflict.prayer_start,
        prayer_end: conflict.prayer_end,
        overlap_minutes: conflict.overlap_min,
        severity: conflict.severity
      },
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        tags: event.tags
      },
      prayer_times_today: prayerTimes,
      constraints: {
        min_meeting_minutes: 15,
        keep_within_same_day: true,
        avoid_prayer_windows: true,
        prefer_small_shifts: true
      }
    });

    // 6) Call OpenAI
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_OPENAI_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text().catch(() => '');
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'OPENAI_FAILED',
        status: openaiResponse.status 
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiResult = await openaiResponse.json();
    const content = aiResult?.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(JSON.stringify({ ok: false, error: 'NO_AI_RESPONSE' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let suggestion: Suggestion;
    try {
      suggestion = JSON.parse(content);
      if (!suggestion.action) {
        throw new Error('Invalid suggestion schema');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'INVALID_AI_RESPONSE',
        details: String(parseError)
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 7) Validate suggested time doesn't conflict with other events
    if (suggestion.new_start && suggestion.new_end && suggestion.action !== 'cancel_event') {
      const { data: overlaps } = await supabase
        .from('events')
        .select('id, title')
        .eq('owner_id', user.id)
        .neq('id', event.id)
        .or(`and(starts_at.lte.${suggestion.new_end},ends_at.gte.${suggestion.new_start})`);

      if (overlaps && overlaps.length > 0) {
        suggestion.reasoning = (suggestion.reasoning ?? '') + 
          ` | تحذير: الوقت المقترح يتعارض مع ${overlaps.length} حدث آخر.`;
        suggestion.confidence = Math.min(0.5, suggestion.confidence ?? 0.5);
      }
    }

    // 8) Update conflict with suggestion
    const { error: updateError } = await supabase
      .from('conflicts')
      .update({
        status: 'suggested',
        suggested_change: suggestion,
        suggestion: suggestion,
        updated_at: new Date().toISOString()
      })
      .eq('id', conflictId)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to update conflict:', updateError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'UPDATE_FAILED',
        details: updateError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      suggestion,
      conflict_id: conflictId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ai-conflicts error:', error);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: 'SERVER_ERROR',
      details: String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
