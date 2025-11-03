import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Span = 'day' | 'week' | 'month';

function spanRange(span: Span, start?: string) {
  const base = start ? new Date(start) : new Date();
  const s = new Date(base);
  const e = new Date(base);

  if (span === 'day') {
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
  }

  if (span === 'week') {
    const d = base.getDay();
    const diff = (d + 6) % 7;
    s.setDate(base.getDate() - diff);
    s.setHours(0, 0, 0, 0);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
  }

  if (span === 'month') {
    s.setDate(1);
    s.setHours(0, 0, 0, 0);
    e.setMonth(s.getMonth() + 1, 0);
    e.setHours(23, 59, 59, 999);
  }

  return { start: s.toISOString(), end: e.toISOString() };
}

async function openaiSummarize(text: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'أنت محلل إنتاجية. لخص بإيجاز وبنقاط. اقترح 3-5 إجراءات عملية، واذكر التعارضات مع الصلاة إن وجدت.',
        },
        { role: 'user', content: text },
      ],
      max_completion_tokens: 800,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI error:', error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'UNAUTHENTICATED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const span = (body?.span ?? 'week') as Span;
    const start_iso = body?.start_iso as string | undefined;

    const { start, end } = spanRange(span, start_iso);

    // Get tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, status, due_date, order_pos')
      .eq('owner_id', user.id)
      .gte('due_date', start.slice(0, 10))
      .lte('due_date', end.slice(0, 10));

    // Get events
    const { data: events } = await supabase
      .from('events')
      .select('id, title, starts_at, ends_at, source_id')
      .eq('owner_id', user.id)
      .gte('starts_at', start)
      .lte('starts_at', end);

    // Get conflicts
    const { data: conflicts } = await supabase
      .from('conflicts')
      .select('id, event_id, prayer_name, severity, status')
      .eq('owner_id', user.id)
      .gte('created_at', start)
      .lte('created_at', end);

    const payload = {
      span,
      start,
      end,
      tasks: tasks ?? [],
      events: events ?? [],
      conflicts: conflicts ?? [],
      stats: {
        total_tasks: tasks?.length ?? 0,
        done_tasks: tasks?.filter((t) => t.status === 'done').length ?? 0,
        total_events: events?.length ?? 0,
        ai_events: events?.filter((e) => e.source_id === 'ai').length ?? 0,
        conflicts: conflicts?.length ?? 0,
      },
    };

    const summary = await openaiSummarize(JSON.stringify(payload, null, 2));

    return new Response(
      JSON.stringify({ ok: true, summary, stats: payload.stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Summarize error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SERVER_ERROR',
        details: String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
