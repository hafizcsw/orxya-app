import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { getQueued } from '@/lib/localdb/dexie'
import { flushQueueOnce } from '@/lib/sync'
import { captureAndSendLocation } from '@/native/location'
import { conflictCheckToday } from '@/lib/conflicts'
import { track } from '@/lib/telemetry'
import type { ConflictRow, LocationSample } from '@/types/conflicts'

const Diagnostics = () => {
  const { user } = useUser()
  const [audit, setAudit] = useState<any[]>([])
  const [queuedItems, setQueuedItems] = useState<any[]>([])
  const [ping, setPing] = useState<'ok' | 'fail' | 'idle'>('idle')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [prayerCount, setPrayerCount] = useState(0)
  const [lastLoc, setLastLoc] = useState<LocationSample | null>(null)
  const [conflicts, setConflicts] = useState<ConflictRow[]>([])
  const [loadingLoc, setLoadingLoc] = useState(false)
  const [loadingConf, setLoadingConf] = useState(false)

  async function loadData() {
    // Test DB connection
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1)
      setPing(error ? 'fail' : 'ok')
      track('diagnostics_ping', { status: error ? 'fail' : 'ok' })
    } catch {
      setPing('fail')
      track('diagnostics_ping', { status: 'fail' })
    }

    // Load audit logs
    if (user) {
      const { data } = await supabase
        .from('command_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      setAudit(data ?? [])
      track('diagnostics_audit_loaded', { count: (data ?? []).length })
    } else {
      setAudit([])
    }

    // Load offline queue
    const queued = await getQueued()
    setQueuedItems(queued)

    // Load prayer times count for today
    if (user) {
      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase
        .from('prayer_times')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('date_iso', today)
      setPrayerCount(count ?? 0)
    }

    // Load last location
    await loadLastLocation()
    
    // Load today's conflicts
    await loadTodayConflicts()
  }

  async function loadLastLocation() {
    if (!user) { setLastLoc(null); return; }
    setLoadingLoc(true)
    const { data } = await supabase
      .from("location_samples")
      .select("*")
      .eq("owner_id", user.id)
      .order("sampled_at", { ascending: false })
      .limit(1)
    setLastLoc(data?.[0] ?? null)
    setLoadingLoc(false)
  }

  function todayISO() { 
    return new Date().toISOString().slice(0, 10); 
  }

  async function loadTodayConflicts() {
    if (!user) { setConflicts([]); return; }
    setLoadingConf(true)
    const { data } = await supabase
      .from("conflicts")
      .select("*")
      .eq("owner_id", user.id)
      .eq("date_iso", todayISO())
      .order("created_at", { ascending: false })
    setConflicts((data ?? []) as ConflictRow[])
    setLoadingConf(false)
  }

  useEffect(() => {
    loadData()
  }, [user?.id])

  async function handleFlushQueue() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await flushQueueOnce()
      if (result.failed) {
        setSyncResult(`❌ فشل: ${result.failed}`)
      } else if (result.flushed === 0) {
        setSyncResult('ℹ️ لا توجد عناصر للمزامنة')
      } else {
        setSyncResult(`✅ تمت المزامنة: ${result.flushed} عنصر`)
        loadData()
      }
    } catch (e: any) {
      setSyncResult(`❌ خطأ: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function handleLocationUpdate() {
    setLoadingLoc(true)
    try {
      await captureAndSendLocation()
      await loadLastLocation()
      track('diagnostics_location_ping')
    } catch (e) {
      console.error('Location update failed:', e)
    } finally {
      setLoadingLoc(false)
    }
  }

  async function handleConflictsCheck() {
    setLoadingConf(true)
    try {
      await conflictCheckToday()
      await loadTodayConflicts()
      track('diagnostics_conflicts_check')
    } catch (e) {
      console.error('Conflicts check failed:', e)
    } finally {
      setLoadingConf(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">التشخيص</h1>

      {/* System Status */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg space-y-3">
        <h2 className="font-semibold text-lg mb-3">حالة النظام</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">SUPABASE_URL:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              import.meta.env.VITE_SUPABASE_URL ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {import.meta.env.VITE_SUPABASE_URL ? '✅ set' : '❌ missing'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Sentry DSN:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              import.meta.env.VITE_SENTRY_DSN ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}>
              {import.meta.env.VITE_SENTRY_DSN ? '✅ set' : '—'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">PostHog Key:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              import.meta.env.VITE_POSTHOG_KEY ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}>
              {import.meta.env.VITE_POSTHOG_KEY ? '✅ set' : '—'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">DB Ping:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              ping === 'ok' ? 'bg-green-100 text-green-800' :
              ping === 'fail' ? 'bg-red-100 text-red-800' :
              'bg-gray-100'
            }`}>
              {ping === 'ok' ? '✅' : ping === 'fail' ? '❌' : '⏳'} {ping}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Session:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              user ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}>
              {user ? '✅ authenticated' : '❌ no session'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Online:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              navigator.onLine ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {navigator.onLine ? '✅ yes' : '❌ offline'}
            </code>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">مواقيت اليوم:</span>
            <code className={`text-xs px-2 py-1 rounded ${
              prayerCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100'
            }`}>
              {prayerCount > 0 ? `✅ ${prayerCount} سجل` : '—'}
            </code>
          </div>
        </div>

        {user && (
          <div className="pt-2 border-t">
            <span className="text-sm font-medium">User ID:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded ml-2 break-all">
              {user.id}
            </code>
          </div>
        )}
      </div>

      {/* Offline Queue */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">طابور الأوفلاين</h2>
          <button
            onClick={handleFlushQueue}
            disabled={syncing || queuedItems.length === 0}
            className="btn max-w-xs text-xs py-1.5"
          >
            {syncing ? 'جاري المزامنة...' : 'مزامنة الآن'}
          </button>
        </div>
        
        {syncResult && (
          <div className="mb-3 text-sm p-2 bg-gray-50 rounded">
            {syncResult}
          </div>
        )}

        {queuedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">✅ الطابور فارغ - جميع البيانات متزامنة</p>
        ) : (
          <div>
            <p className="text-sm mb-2">⏳ {queuedItems.length} عنصر في الانتظار:</p>
            <pre className="text-xs overflow-auto max-h-48 bg-gray-50 p-2 rounded">
              {JSON.stringify(queuedItems, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">الموقع</h2>
          <button
            onClick={handleLocationUpdate}
            disabled={loadingLoc}
            className="btn max-w-xs text-xs py-2 px-4"
          >
            {loadingLoc ? 'جاري التحديث...' : 'تحديث الموقع الآن'}
          </button>
        </div>
        
        {lastLoc ? (
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">آخر عينة:</span>{' '}
              <code className="bg-secondary/50 px-2 py-0.5 rounded text-xs">
                {new Date(lastLoc.sampled_at).toLocaleString('ar-EG')}
              </code>
            </div>
            <div>
              <span className="text-muted-foreground">الإحداثيات:</span>{' '}
              <code className="bg-secondary/50 px-2 py-0.5 rounded text-xs">
                lat {Number(lastLoc.latitude).toFixed(5)}, lon {Number(lastLoc.longitude).toFixed(5)}
              </code>
            </div>
            {lastLoc.accuracy_m && (
              <div>
                <span className="text-muted-foreground">الدقة:</span>{' '}
                <code className="bg-secondary/50 px-2 py-0.5 rounded text-xs">
                  ~{Math.round(Number(lastLoc.accuracy_m))}m
                </code>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">لا توجد عينة موقع بعد</p>
        )}
      </div>

      {/* Conflicts */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg">تعارضات اليوم</h2>
          <button
            onClick={handleConflictsCheck}
            disabled={loadingConf || !user}
            className="btn max-w-xs text-xs py-2 px-4"
          >
            {loadingConf ? 'جاري الفحص...' : 'فحص التعارضات الآن'}
          </button>
        </div>
        
        <div className="mb-3">
          <span className="text-sm text-muted-foreground">
            {conflicts.length} تعارض اليوم
          </span>
        </div>

        {conflicts.length === 0 ? (
          <div className="text-sm p-3 bg-emerald-500/10 text-emerald-700 border-2 border-emerald-500/30 rounded-2xl">
            ✅ لا تعارضات اليوم - جدولك متوافق مع مواقيت الصلاة
          </div>
        ) : (
          <div className="space-y-2">
            {conflicts.map((c) => (
              <div key={c.id} className="border-2 rounded-2xl p-3 bg-secondary/20">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">
                    {c.object_kind === "event" ? "تعارض مع حدث" : c.object_kind}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.severity === "high" 
                      ? "bg-red-500 text-white" 
                      : c.severity === "medium" 
                      ? "bg-amber-500 text-white" 
                      : "bg-green-600 text-white"
                  }`}>
                    {c.severity}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">الصلاة:</span>{' '}
                    <b>{c.prayer_name}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">التداخل:</span>{' '}
                    <code className="text-xs">{c.overlap_min} دقيقة</code>
                  </div>
                  {c.event_id && (
                    <div className="text-xs text-muted-foreground mt-1">
                      مرتبط بالحدث: {c.event_id.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg">
        <h2 className="font-bold text-lg mb-3">أزرار الاختبار</h2>
        <div className="flex gap-2 flex-wrap">
          <button 
            className="btn max-w-xs" 
            onClick={() => { 
              console.error('Oryxa test error - Sentry temporarily disabled');
              alert('Test error logged to console (Sentry temporarily disabled)');
            }}
          >
            Throw test error (Console)
          </button>
          <button 
            className="btn max-w-xs" 
            onClick={() => track('test_event_clicked', { at: Date.now() })}
          >
            Send test event (PostHog)
          </button>
        </div>
      </div>

      {/* Audit Log */}
      <div className="p-4 bg-card border-2 rounded-3xl shadow-lg">
        <h2 className="font-semibold text-lg mb-3">آخر 5 أوامر محفوظة</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد أوامر محفوظة</p>
        ) : (
          <pre className="text-xs overflow-auto max-h-96 bg-gray-50 p-2 rounded">
            {JSON.stringify(audit, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export default Diagnostics
