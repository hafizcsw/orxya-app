import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { genIdem } from '@/lib/sync'
import { useUser } from '@/lib/auth'
import { Toast } from '@/components/Toast'
import { track } from '@/lib/telemetry'
import { SessionBanner } from '@/components/SessionBanner'
import { ensureNotificationPerms, rescheduleAllFromDB } from '@/lib/notify'
import { getDeviceLocation } from '@/native/geo'
import { syncPrayers, schedulePrayersFor } from '@/native/prayer'
import { orchestrate, grantScopes } from '@/lib/ai'
import { throttle } from '@/lib/throttle'
import { OrchestratorPanel } from '@/components/OrchestratorPanel'

const Automation = () => {
  const { user } = useUser()
  const [rows, setRows] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiReply, setAiReply] = useState<string | null>(null)
  const [aiSessionId, setAiSessionId] = useState<string | null>(null)
  const [consentAsk, setConsentAsk] = useState<{scopes:string[], message:string} | null>(null)
  const [autoConflictCheck, setAutoConflictCheck] = useState(() => 
    localStorage.getItem("conflict_auto_check") === "enabled"
  );

  async function load() {
    if (!user) return setRows([])
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setRows(data ?? [])
  }

  useEffect(() => { 
    void ensureNotificationPerms();
    load().then(() => void rescheduleAllFromDB());
  }, [user?.id])

  async function saveDefaults() {
    try {
      const body = (label: string, time_local: string) => ({
        command: 'set_alarm',
        idempotency_key: genIdem(),
        payload: { label, time_local }
      })
      await supabase.functions.invoke('commands', { body: body('Morning Plan', '08:00') })
      await supabase.functions.invoke('commands', { body: body('Daily Check-in', '21:30') })
      await rescheduleAllFromDB();
      setToast('تم الحفظ ✅')
      track('automation_saved_defaults', { count: 2 })
      track('automation_rescheduled_after_save', { count: 2 })
      load()
    } catch {
      setToast('تعذّر الحفظ الآن — جرّب لاحقًا')
    }
  }

  async function syncTodayPrayers() {
    try {
      let lat = null, lon = null;
      const loc = await getDeviceLocation();
      if (loc) { lat = loc.lat; lon = loc.lon; }
      
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (uid && lat && lon) {
        await supabase.from('profiles').update({ latitude: lat, longitude: lon }).eq('id', uid);
      }

      const today = new Date().toISOString().slice(0, 10);
      await syncPrayers(today);
      await schedulePrayersFor(today);
      
      setToast('تمت مزامنة مواقيت اليوم وجدولة التنبيهات ⏰');
      track('prayers_synced_and_scheduled');
    } catch (e: any) {
      setToast(`خطأ: ${e.message}`);
    }
  }

  async function syncRangePrayers(days: number) {
    try {
      const base = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        await supabase.functions.invoke('prayer-sync', { body: { date: iso, days: 1 } });
      }
      setToast(`تمت مزامنة مواقيت ${days} أيام ✅`);
      track('prayers_synced_range', { days });
    } catch (e: any) {
      setToast(`خطأ: ${e.message}`);
    }
  }

  function buildDailyPlanPrompt() {
    return [
      "ابنِ خطة اليوم من تقويمي ومهامي مع احترام مواقيت الصلاة.",
      "• راجع تعارضات الصلاة واقترح حلولًا إن وجدت.",
      "• أنشئ/حدّث مهام بالوقت المناسب، وأضف تذكيرات محلية.",
      "• إن لزم اسألني عن البيانات الناقصة فقط.",
    ].join("\n");
  }

  const reloadTasksThrottled = useMemo(
    () => throttle(() => {}, 300),
    []
  );

  function toggleAutoConflictCheck() {
    const newValue = !autoConflictCheck;
    setAutoConflictCheck(newValue);
    localStorage.setItem("conflict_auto_check", newValue ? "enabled" : "disabled");
    setToast(newValue ? "التحقق التلقائي مُفعّل ✅" : "التحقق اليدوي مُفعّل 🔧");
    track("conflict_auto_check_toggled", { enabled: newValue });
  }

  async function requestDailyPlan() {
    setAiBusy(true);
    setAiReply(null);

    try {
      track("ai_plan_today_request");
      const msg = buildDailyPlanPrompt();
      const data = await orchestrate(msg, aiSessionId || undefined);

      if (data.session_id) setAiSessionId(data.session_id);
      if (data.reply) setAiReply(data.reply);

      const ask = (data.actions ?? []).find(a => a.type === "ask_consent") as any;
      if (ask?.payload?.scopes?.length) {
        setConsentAsk({ scopes: ask.payload.scopes, message: ask.payload.message || "أحتاج إذنك." });
        track("ai_plan_today_consent_missing", { scopes: ask.payload.scopes });
        return;
      }

      track("ai_plan_today_success");

      await rescheduleAllFromDB();
      reloadTasksThrottled();
      const today = new Date().toISOString().slice(0,10);
      await syncPrayers(today);
      await schedulePrayersFor(today);

      setToast("تم اقتراح خطة اليوم ✅");
    } catch (e:any) {
      setToast(`تعذّر توليد الخطة: ${e?.message ?? "خطأ"}`);
      track("ai_plan_today_error");
    } finally {
      setAiBusy(false);
    }
  }


  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">الأتمتة والتذكيرات</h1>
      
      <SessionBanner />
      
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-lg">
          سجّل الدخول لمزامنة التذكيرات.
        </div>
      )}
      
      <button onClick={saveDefaults} className="btn max-w-xs">
        حفظ التذكيرات الافتراضية (08:00 + 21:30)
      </button>
      
      <div className="p-4 border rounded-2xl bg-white">
        <div className="font-semibold mb-2">التذكيرات المحفوظة</div>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تذكيرات محفوظة</p>
        ) : (
          <ul className="text-sm space-y-1">
            {rows.map(r => (
              <li key={r.id}>• {r.label} — {r.time_local} {r.enabled ? '✅' : '⏸️'}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border p-4 bg-white/70 space-y-3">
        <div className="text-sm opacity-70 font-semibold">الذكاء الاصطناعي</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            disabled={aiBusy}
            onClick={requestDailyPlan}
            className="btn disabled:opacity-50"
          >
            {aiBusy ? "جاري البناء…" : "اقترح خطة اليوم بالذكاء الصناعي"}
          </button>
          {aiReply && <span className="text-sm text-muted-foreground">ردّ المساعد: {aiReply}</span>}
        </div>
      </div>

      {/* Orchestrator Panel */}
      <OrchestratorPanel />

      {consentAsk && (
        <div className="border rounded-xl p-4 space-y-3 bg-background">
          <div className="font-medium">الموافقة مطلوبة</div>
          <div className="text-sm text-muted-foreground">{consentAsk.message}</div>
          <div className="text-sm">الصلاحيات: {consentAsk.scopes.join(", ")}</div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded bg-primary text-primary-foreground"
              onClick={async () => {
                await grantScopes(consentAsk.scopes);
                setConsentAsk(null);
                setToast("تم منح الصلاحيات. أعيد المحاولة…");
                requestDailyPlan();
              }}
            >
              سماح
            </button>
            <button className="px-4 py-2 rounded border" onClick={()=>setConsentAsk(null)}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-4 bg-white/70 space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-70 font-semibold">مواقيت الصلاة</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {autoConflictCheck ? "تحقق تلقائي" : "تحقق يدوي"}
            </span>
            <button
              onClick={toggleAutoConflictCheck}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoConflictCheck ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoConflictCheck ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            className="btn" 
            onClick={syncTodayPrayers}
          >
            مزامنة مواقيت اليوم + جدولة
          </button>
          <button 
            className="btn" 
            onClick={() => syncRangePrayers(7)}
          >
            مزامنة 7 أيام
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast} />}
    </div>
  )
}

export default Automation
