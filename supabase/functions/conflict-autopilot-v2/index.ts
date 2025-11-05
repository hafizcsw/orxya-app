// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(b: any, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, "content-type": "application/json" }
  });
}

function getTimeOfDay(hour: number): string {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// قواعد متقدمة للصلاة - buffers ديناميكية
const PRAYER_BUFFERS: Record<string, { pre: number; post: number }> = {
  fajr: { pre: 15, post: 30 }, // الفجر أطول
  dhuhr: { pre: 10, post: 20 },
  asr: { pre: 10, post: 20 },
  maghrib: { pre: 10, post: 15 }, // المغرب أقصر
  isha: { pre: 10, post: 20 }
};

interface Decision {
  action: string;
  confidence: number;
  requiresConsent: boolean;
  patch?: any;
  undoPatch?: any;
  reason: string;
}

async function getLearnedConfidence(
  supabase: any,
  ownerId: string,
  action: string,
  context: any
): Promise<number | null> {
  const { data } = await supabase.rpc('calculate_learned_confidence', {
    p_owner_id: ownerId,
    p_action: action,
    p_context: context
  });
  
  return data;
}

async function decideWithLearning(
  supabase: any,
  ev: any,
  conflict: any,
  ownerId: string
): Promise<Decision> {
  const prayerName = conflict.prayer_name;
  const overlapMin = conflict.overlap_min || 0;
  const buffers = PRAYER_BUFFERS[prayerName?.toLowerCase()] || { pre: 10, post: 20 };
  
  const hour = new Date(ev.starts_at).getHours();
  const timeOfDay = getTimeOfDay(hour);
  const dayOfWeek = new Date(ev.starts_at).getDay();
  
  const context = {
    prayer_name: prayerName,
    overlap_min: overlapMin,
    time_of_day: timeOfDay,
    day_of_week: dayOfWeek,
    event_duration: ev.duration_min || 30,
    buffers
  };

  // حالات القرار
  let action = 'none';
  let baseConfidence = 50;
  let patch: any = {};
  let undoPatch: any = {};
  let reason = '';

  // 1. تعارض كبير - اقتراح إعادة جدولة
  if (overlapMin > 20) {
    action = 'reschedule';
    baseConfidence = 80;
    
    // حساب وقت جديد بعد الصلاة + buffer
    const prayerEnd = new Date(conflict.prayer_end);
    const newStart = new Date(prayerEnd.getTime() + buffers.post * 60000);
    
    patch = {
      shift_minutes: Math.ceil((newStart.getTime() - new Date(ev.starts_at).getTime()) / 60000)
    };
    
    undoPatch = {
      shift_minutes: -patch.shift_minutes
    };
    
    reason = `تعارض كبير (${overlapMin} دقيقة) مع ${prayerName}. اقتراح التأجيل ${buffers.post} دقيقة بعد الصلاة.`;
  }
  // 2. تعارض متوسط - تقصير الحدث أو جعله شفاف
  else if (overlapMin > 10 && overlapMin <= 20) {
    // إذا كان الحدث طويل، نقترح تقصيره
    if ((ev.duration_min || 30) > 30) {
      action = 'shorten';
      baseConfidence = 70;
      
      const newDuration = Math.max(15, (ev.duration_min || 30) - overlapMin - buffers.pre);
      patch = {
        duration_minutes: newDuration
      };
      undoPatch = {
        duration_minutes: ev.duration_min
      };
      reason = `تقصير الحدث ليتناسب مع وقت ${prayerName}`;
    } else {
      action = 'make_transparent';
      baseConfidence = 65;
      patch = { transparency: 'transparent' };
      undoPatch = { transparency: ev.transparency || 'opaque' };
      reason = `جعل الحدث شفافاً للسماح بأداء ${prayerName}`;
    }
  }
  // 3. تعارض صغير - جعله مبدئي أو شفاف
  else if (overlapMin <= 10) {
    action = 'make_tentative';
    baseConfidence = 60;
    patch = { status: 'tentative' };
    undoPatch = { status: ev.status || 'confirmed' };
    reason = `تعارض صغير - جعل الحدث مبدئياً`;
  }

  // الحصول على confidence من التعلم
  const learnedConfidence = await getLearnedConfidence(supabase, ownerId, action, context);
  
  // دمج base confidence مع learned confidence
  const finalConfidence = learnedConfidence !== null 
    ? (baseConfidence * 0.3 + learnedConfidence * 0.7) // وزن أكبر للتعلم
    : baseConfidence;

  // تحديد إذا كنا نحتاج موافقة
  const requiresConsent = finalConfidence < 70;

  return {
    action,
    confidence: finalConfidence,
    requiresConsent,
    patch,
    undoPatch,
    reason
  };
}

async function applyPatch(supabase: any, ev: any, patch: any) {
  const before = { ...ev };
  let updated: any = {};

  if (patch.shift_minutes) {
    const ms = patch.shift_minutes * 60 * 1000;
    const startDate = new Date(ev.starts_at);
    const endDate = ev.ends_at ? new Date(ev.ends_at) : null;

    updated.starts_at = new Date(startDate.getTime() + ms).toISOString();
    if (endDate) {
      updated.ends_at = new Date(endDate.getTime() + ms).toISOString();
    }
    updated.pending_push = true;
  }

  if (patch.duration_minutes) {
    const startDate = new Date(ev.starts_at);
    updated.ends_at = new Date(startDate.getTime() + patch.duration_minutes * 60000).toISOString();
    updated.duration_min = patch.duration_minutes;
    updated.pending_push = true;
  }

  if (patch.transparency) {
    updated.transparency = patch.transparency;
    updated.pending_push = true;
  }

  if (patch.status) {
    updated.status = patch.status;
    updated.pending_push = true;
  }

  if (Object.keys(updated).length === 0) {
    return { before, after: ev };
  }

  const { data, error } = await supabase
    .from('events')
    .update(updated)
    .eq('id', ev.id)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return { before, after: data };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ ok: false, error: "UNAUTHENTICATED" }, 401);

    // الحصول على التعارضات المفتوحة
    const { data: conflicts } = await supabase
      .from('conflicts')
      .select('*')
      .eq('owner_id', user.id)
      .in('status', ['open', 'suggested'])
      .order('created_at', { ascending: true })
      .limit(10);

    if (!conflicts || conflicts.length === 0) {
      return json({ ok: true, message: 'لا توجد تعارضات للمعالجة' });
    }

    const results = [];

    for (const conflict of conflicts) {
      const { data: ev } = await supabase
        .from('events')
        .select('*')
        .eq('id', conflict.event_id)
        .maybeSingle();

      if (!ev) continue;

      // اتخاذ القرار مع التعلم
      const decision = await decideWithLearning(supabase, ev, conflict, user.id);

      if (!decision.requiresConsent && decision.action !== 'none') {
        // تطبيق التغيير مباشرة
        const { before, after } = await applyPatch(supabase, ev, decision.patch);

        // تسجيل الإجراء
        const undoToken = crypto.randomUUID();
        await supabase.from('autopilot_actions').insert({
          owner_id: user.id,
          conflict_id: conflict.id,
          action: 'apply',
          suggested_action: decision.action,
          confidence: decision.confidence,
          patch_before: { event: before },
          patch_after: { event: after },
          undo_token: undoToken
        });

        // تحديث التعارض
        await supabase.from('conflicts').update({
          status: 'auto_resolved',
          resolution: decision.action,
          decided_action: decision.action,
          confidence: decision.confidence,
          undo_patch: decision.undoPatch,
          learning_applied: true,
          decided_at: new Date().toISOString()
        }).eq('id', conflict.id);

        // إنشاء إشعار
        await supabase.from('notifications').insert({
          owner_id: user.id,
          title: 'تم حل تعارض تلقائياً ✅',
          body: decision.reason,
          payload: {
            type: 'autopilot_applied',
            conflict_id: conflict.id,
            event_id: ev.id,
            event_title: ev.title,
            action: decision.action,
            undo_token: undoToken,
            confidence: decision.confidence
          },
          channel: 'local',
          priority: 1
        });

        results.push({ conflict_id: conflict.id, action: 'applied', decision });
      } else {
        // اقتراح فقط
        await supabase.from('conflicts').update({
          status: 'suggested',
          suggested_action: decision.action,
          confidence: decision.confidence,
          suggested_change: decision.patch,
          undo_patch: decision.undoPatch,
          learning_applied: true
        }).eq('id', conflict.id);

        // إنشاء إشعار اقتراح
        await supabase.from('notifications').insert({
          owner_id: user.id,
          title: 'اقتراح لحل تعارض 💡',
          body: decision.reason,
          payload: {
            type: 'autopilot_suggest',
            conflict_id: conflict.id,
            event_id: ev.id,
            event_title: ev.title,
            action: decision.action,
            patch: decision.patch,
            confidence: decision.confidence
          },
          channel: 'local',
          priority: 2
        });

        results.push({ conflict_id: conflict.id, action: 'suggested', decision });
      }
    }

    return json({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error('[conflict-autopilot-v2]', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
