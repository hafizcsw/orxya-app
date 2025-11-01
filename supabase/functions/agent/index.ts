import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `أنت وكيل جدولة ومهام ذكي للمستخدم. مبادئ أساسية:
- احترم تفضيلات المستخدم (المنطقة الزمنية، طريقة حساب الصلاة، الدين).
- لا تنشئ أحداثًا متعارضة مع مواقيت الصلاة. إنْ لزم، اقترح وقتًا بديلًا بعد نهاية نافذة الصلاة.
- اسأل بلُطف عن أي معلومة ناقصة (مدة الحدث، الموقع، المشاركون، درجة الأولوية).
- انقل الأوامر لواجهات الأدوات بدقّة عبر JSON فقط.
- استخدم نطاق الأيام الافتراضي 7 أيام عند الفحص، وإضافة buffer للصلاة 30 دقيقة افتراضيًا.
- عند وجود تغيير موقع ≥ 0.7 كم، اطلب sync مواقيت الصلاة اليوم + 2 يومًا قادمين.
- حدّد أي التباسات زمنية بالـ timezone الخاص بالمستخدم.
- كن مختصراً ومباشراً في إجاباتك.

أدوات القوالب والتلخيص:
- عند طلب "خطة اليوم" أو "work after maghrib" استخدم apply_template
- عند طلب "ملخص اليوم/الأسبوع/الشهر" استخدم summarize_period
- عند أسئلة البحث مثل "اعرض مهامي المتأخرة" استخدم nlq_search`;

const FEWSHOT: any[] = [
  { role: "user", content: "رتّب اجتماع مراجعة عرض الساعة 5 مساء اليوم لمدة 30 دقيقة." },
  { role: "assistant", content: "هل تفضّل بعد صلاة العصر أم بعدها مباشرةً؟ أحتاج مدة الاجتماع إن لم تكن 30 دقيقة." },
  { role: "user", content: "بعد العصر مباشرةً، 30 دقيقة." },
  { role: "assistant", content: "سأحجز اجتماع 30 دقيقة بعد العصر، وسأتحقق من التعارض مع مواقيت الصلاة ثم أؤكد الوقت المناسب." },
  { role: "user", content: "خطة عمل بعد المغرب" },
  { role: "assistant", content: "سأطبّق قالب 'عمل بعد المغرب' الذي يتضمن جلستي عمل عميق واستراحة ومراجعة بريد." },
  { role: "user", content: "لخّص أسبوعي" },
  { role: "assistant", content: "سأجمع أحداثك ومهامك للأسبوع وأقدم ملخصاً مع توصيات عملية." }
];

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

function getToolsSpec() {
  const fn = (name:string, desc:string, params:any) => ({ 
    type: 'function', 
    function: { name, description: desc, parameters: params }
  });
  
  return [
    fn('get_profile', 'جلب تفضيلات المستخدم (timezone, prayer_method...)', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    fn('list_events_window', 'جلب أحداث المستخدم خلال نافذة زمنية', {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'ISO datetime' },
        to: { type: 'string', description: 'ISO datetime' },
      },
      required: ['from', 'to'],
      additionalProperties: false,
    }),
    fn('create_event', 'إنشاء حدث جديد', {
      type: 'object',
      properties: {
        title: { type: 'string' },
        starts_at: { type: 'string', description: 'ISO datetime' },
        ends_at: { type: 'string', description: 'ISO datetime' },
        duration_min: { type: 'number' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['title'],
      additionalProperties: false,
    }),
    fn('update_event', 'تعديل حدث موجود', {
      type: 'object',
      properties: {
        event_id: { type: 'string' },
        title: { type: 'string' },
        starts_at: { type: 'string' },
        ends_at: { type: 'string' },
        duration_min: { type: 'number' },
        description: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['event_id'],
      additionalProperties: false,
    }),
    fn('create_task', 'إنشاء مهمة جديدة', {
      type: 'object',
      properties: {
        project_id: { type: 'string' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['title'],
      additionalProperties: false,
    }),
    fn('list_tasks', 'جلب قائمة المهام', {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        project_id: { type: 'string' },
      },
      additionalProperties: false,
    }),
    fn('update_task_status', 'تحديث حالة مهمة', {
      type: 'object',
      properties: {
        task_id: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
      },
      required: ['task_id', 'status'],
      additionalProperties: false,
    }),
    fn('location_update', 'تسجيل موقع المستخدم ومزامنة مواقيت الصلاة', {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lon: { type: 'number' },
        accuracy: { type: 'number' },
      },
      required: ['lat', 'lon'],
      additionalProperties: false,
    }),
    fn('prayer_sync_today', 'تشغيل مزامنة مواقيت الصلاة لليوم', {
      type: 'object',
      properties: {},
      additionalProperties: false,
    }),
    fn('conflict_check', 'فحص تعارضات الصلاة مع الأحداث', {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'عدد الأيام للفحص (افتراضي: 7)' },
        buffer_min: { type: 'number', description: 'هامش الصلاة بالدقائق (افتراضي: 30)' },
        upsert: { type: 'boolean', description: 'حفظ النتائج (افتراضي: true)' },
      },
      additionalProperties: false,
    }),
    fn('enqueue_alarm', 'إنشاء تنبيه محلي لحدث', {
      type: 'object',
      properties: {
        label: { type: 'string' },
        time_local: { type: 'string', description: 'HH:MM' },
      },
      required: ['label', 'time_local'],
      additionalProperties: false,
    }),
    fn('apply_template', 'تطبيق قالب ذكي لإنشاء مجموعة أحداث/مهام', {
      type: 'object',
      properties: {
        template_key: { 
          type: 'string', 
          enum: ['work_after_maghrib', 'gym_after_isha', 'deep_work_morning', 'balanced_day'],
          description: 'نوع القالب' 
        },
        date: { type: 'string', description: 'YYYY-MM-DD (افتراضي: اليوم)' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['template_key'],
      additionalProperties: false,
    }),
    fn('summarize_period', 'تلخيص فترة من المهام والأحداث', {
      type: 'object',
      properties: {
        span: { type: 'string', enum: ['day', 'week', 'month'], description: 'نطاق التلخيص' },
        start_iso: { type: 'string', description: 'تاريخ البداية (اختياري)' },
      },
      required: ['span'],
      additionalProperties: false,
    }),
    fn('nlq_search', 'بحث لغوي طبيعي في المهام والأحداث', {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'استعلام بالعربية أو الإنجليزية' },
      },
      required: ['query'],
      additionalProperties: false,
    }),
  ];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ ok: false, error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
    const userMessage = String(body?.message ?? '').slice(0, 8000);
    const now = new Date().toISOString();

    console.log(`Agent request from user ${user.id}: ${userMessage.slice(0, 100)}...`);

    // Session handling
    const session_id_in = body?.session_id as string | undefined;
    let sessionId = session_id_in ?? null;

    if (!sessionId) {
      const { data: sdata, error: serr } = await supabase.from('ai_sessions')
        .insert({ owner_id: user.id, title: (body?.title ?? 'جلسة جديدة') })
        .select('id').single();
      if (serr) throw serr;
      sessionId = sdata.id;
    } else {
      await supabase.from('ai_sessions')
        .update({ last_activity: now })
        .eq('id', sessionId)
        .eq('owner_id', user.id);
    }

    // Load conversation history
    const { data: prev } = await supabase.from('ai_messages')
      .select('role, content')
      .eq('owner_id', user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    function toOpenAIMsg(m: any) {
      const c = m.content || {};
      if (m.role === 'tool') {
        return { 
          role: 'tool', 
          content: JSON.stringify(c.tool_result ?? c), 
          tool_call_id: c.tool_call_id ?? undefined 
        };
      }
      return { role: m.role, content: String(c.text ?? '') };
    }

    const history = (prev ?? []).map(toOpenAIMsg);

    // Save user message
    await supabase.from('ai_messages').insert({
      session_id: sessionId,
      owner_id: user.id,
      role: 'user',
      content: { text: userMessage }
    });

    // Track if events were modified
    let touchedEvents = false;

    // Tool implementations
    const toolImplementations: Record<string, (args: any) => Promise<any>> = {
      async get_profile() {
        const { data } = await supabase
          .from('profiles')
          .select('timezone, prayer_method, latitude, longitude, full_name')
          .eq('id', user.id)
          .maybeSingle();
        return data ?? {};
      },

      async list_events_window(args: { from: string; to: string }) {
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('owner_id', user.id)
          .gte('starts_at', args.from)
          .lte('starts_at', args.to)
          .order('starts_at');
        return data ?? [];
      },

      async create_event(args: any) {
        touchedEvents = true;
        const row = {
          owner_id: user.id,
          title: args.title,
          starts_at: args.starts_at ?? null,
          ends_at: args.ends_at ?? null,
          duration_min: args.duration_min ?? 30,
          description: args.description ?? null,
          tags: args.tags ?? [],
          source_id: 'ai',
          is_ai_created: true,
          created_at: now,
        };

        const { data, error } = await supabase.from('events').insert(row).select('id, title');
        if (error) throw error;
        return data?.[0] ?? {};
      },

      async update_event(args: any) {
        touchedEvents = true;
        const patch: any = {};
        if (args.title) patch.title = args.title;
        if (args.starts_at) patch.starts_at = args.starts_at;
        if (args.ends_at) patch.ends_at = args.ends_at;
        if (args.duration_min != null) patch.duration_min = args.duration_min;
        if (args.description) patch.description = args.description;
        if (args.tags) patch.tags = args.tags;

        const { data, error } = await supabase
          .from('events')
          .update(patch)
          .eq('id', args.event_id)
          .eq('owner_id', user.id)
          .select('id, title');
        if (error) throw error;
        return data?.[0] ?? {};
      },

      async create_task(args: any) {
        const now = new Date().toISOString();
        const row = {
          owner_id: user.id,
          project_id: args.project_id ?? null,
          title: args.title,
          status: args.status ?? 'todo',
          order_pos: 1_000_000,
          due_date: args.due_date ?? null,
          created_at: now,
        };

        const { data, error } = await supabase.from('tasks').insert(row).select('id, title');
        if (error) throw error;
        return data?.[0] ?? {};
      },

      async list_tasks(args: any) {
        let query = supabase.from('tasks').select('*').eq('owner_id', user.id);
        
        if (args.status) {
          query = query.eq('status', args.status);
        }
        if (args.project_id) {
          query = query.eq('project_id', args.project_id);
        }

        const { data } = await query.order('order_pos');
        return data ?? [];
      },

      async update_task_status(args: { task_id: string; status: string }) {
        const { data, error } = await supabase
          .from('tasks')
          .update({ status: args.status })
          .eq('id', args.task_id)
          .eq('owner_id', user.id)
          .select('id, title, status');
        if (error) throw error;
        return data?.[0] ?? {};
      },

      async location_update(args: { lat: number; lon: number; accuracy?: number }) {
        const { data, error } = await supabase.functions.invoke('location-update', {
          body: args,
        });
        if (error) throw error;
        return data ?? {};
      },

      async prayer_sync_today() {
        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase.functions.invoke('prayer-sync', {
          body: { date: today, days: 1 },
        });
        if (error) throw error;
        return data ?? {};
      },

      async conflict_check(args: any) {
        const { data, error } = await supabase.functions.invoke('conflict-check', {
          body: {
            days: args?.days ?? 7,
            buffer_min: args?.buffer_min ?? 30,
            upsert: args?.upsert ?? true,
          },
        });
        if (error) throw error;
        return data ?? {};
      },

      async enqueue_alarm(args: any) {
        const payload = {
          command: 'set_alarm',
          idempotency_key: crypto.randomUUID(),
          payload: { label: String(args.label), time_local: String(args.time_local) }
        };
        const { data, error } = await supabase.functions.invoke('commands', { body: payload });
        if (error) throw error;
        return data ?? {};
      },

      async apply_template(args: any) {
        const { data, error } = await supabase.functions.invoke('templates', {
          body: {
            template_key: args.template_key,
            date: args.date,
            tags: args.tags ?? [],
          },
        });
        if (error) throw error;
        return data ?? {};
      },

      async summarize_period(args: any) {
        const { data, error } = await supabase.functions.invoke('summarize-period', {
          body: {
            span: args.span,
            start_iso: args.start_iso,
          },
        });
        if (error) throw error;
        return data ?? {};
      },

      async nlq_search(args: any) {
        const q = String(args.query || '').toLowerCase();
        
        // Parse query intent
        const isDone = q.includes('done') || q.includes('منجزة') || q.includes('مكتملة');
        const isTodo = q.includes('todo') || q.includes('قيد الانتظار');
        const isDoing = q.includes('doing') || q.includes('قيد التنفيذ');
        const isOverdue = q.includes('overdue') || q.includes('متأخرة') || q.includes('متأخر');
        const isToday = q.includes('today') || q.includes('اليوم');
        const isTomorrow = q.includes('tomorrow') || q.includes('غد') || q.includes('غدا');
        
        const isEvents = q.includes('event') || q.includes('اجتماع') || q.includes('حدث');
        const isTasks = q.includes('task') || q.includes('مهمة') || q.includes('مهام');
        
        // Default to tasks if not specified
        const domain = isEvents && !isTasks ? 'events' : 'tasks';
        
        if (domain === 'tasks') {
          let query = supabase.from('tasks')
            .select('id, title, status, due_date, order_pos')
            .eq('owner_id', user.id)
            .limit(100);
          
          if (isDone) query = query.eq('status', 'done');
          if (isTodo) query = query.eq('status', 'todo');
          if (isDoing) query = query.eq('status', 'doing');
          
          const today = new Date().toISOString().slice(0, 10);
          
          if (isToday) {
            query = query.eq('due_date', today);
          }
          
          if (isTomorrow) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            query = query.eq('due_date', tomorrow.toISOString().slice(0, 10));
          }
          
          if (isOverdue) {
            query = query.lt('due_date', today).neq('status', 'done');
          }
          
          const { data } = await query.order('due_date', { ascending: true });
          return { kind: 'tasks', items: data ?? [], count: data?.length ?? 0 };
        } else {
          // Events
          let start = new Date();
          start.setHours(0, 0, 0, 0);
          let end = new Date();
          end.setHours(23, 59, 59, 999);
          
          if (isTomorrow) {
            start.setDate(start.getDate() + 1);
            end.setDate(end.getDate() + 1);
          }
          
          const { data } = await supabase.from('events')
            .select('id, title, starts_at, ends_at, tags')
            .eq('owner_id', user.id)
            .gte('starts_at', start.toISOString())
            .lte('starts_at', end.toISOString())
            .order('starts_at', { ascending: true })
            .limit(100);
          
          return { kind: 'events', items: data ?? [], count: data?.length ?? 0 };
        }
      },
    };

    // OpenAI conversation loop
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...FEWSHOT,
      ...history,
      { role: 'user', content: userMessage },
    ] as any[];

    let toolLoop = 0;
    const maxLoops = 8;
    let finalReply = '';
    const toolOutputs: any[] = [];

    while (toolLoop < maxLoops) {
      toolLoop++;
      console.log(`Tool loop ${toolLoop}`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-mini-2025-08-07',
          messages,
          tools: getToolsSpec(),
          tool_choice: 'auto',
          max_completion_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI error:', error);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];
      const toolCalls: ToolCall[] = choice?.message?.tool_calls ?? [];

      // No more tools needed - final answer
      if (!toolCalls?.length) {
        finalReply = String(choice?.message?.content ?? '').trim();
        
        // Save assistant message
        await supabase.from('ai_messages').insert({
          session_id: sessionId,
          owner_id: user.id,
          role: 'assistant',
          content: { text: finalReply }
        });
        
        break;
      }

      // Execute tools
      messages.push({
        role: 'assistant',
        content: choice.message.content ?? null,
        tool_calls: toolCalls,
      } as any);

      // Save assistant tool request
      await supabase.from('ai_messages').insert({
        session_id: sessionId,
        owner_id: user.id,
        role: 'assistant',
        content: { text: choice?.message?.content ?? null, tool_calls: toolCalls }
      });

      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`Executing tool: ${toolName}`, toolArgs);

        let result: any = { ok: true };
        try {
          const impl = toolImplementations[toolName];
          if (impl) {
            result = await impl(toolArgs);
          } else {
            result = { ok: false, error: 'TOOL_NOT_FOUND' };
          }
        } catch (e: any) {
          console.error(`Tool ${toolName} error:`, e);
          result = { ok: false, error: String(e?.message ?? e) };
        }

        toolOutputs.push({ tool_call_id: toolCall.id, name: toolName, result });
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        } as any);

        // Save tool result
        await supabase.from('ai_messages').insert({
          session_id: sessionId,
          owner_id: user.id,
          role: 'tool',
          content: {
            tool_name: toolName,
            tool_args: toolArgs,
            tool_result: result,
            tool_call_id: toolCall.id
          }
        });
      }
    }

    console.log(`Agent completed after ${toolLoop} loops`);

    // Post-flight conflict check if events were modified
    if (touchedEvents) {
      try {
        const conflictResult = await toolImplementations.conflict_check({ 
          days: 7, 
          buffer_min: 30, 
          upsert: true 
        });
        await supabase.from('ai_messages').insert({
          session_id: sessionId,
          owner_id: user.id,
          role: 'tool',
          content: { 
            tool_name: 'conflict_check', 
            tool_result: conflictResult, 
            summary: 'post-flight check' 
          }
        });
      } catch (e) {
        console.error('Post-flight conflict check failed:', e);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        reply: finalReply,
        tool_outputs: toolOutputs,
        session_id: sessionId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent error:', error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: 'SERVER_ERROR',
        details: String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
