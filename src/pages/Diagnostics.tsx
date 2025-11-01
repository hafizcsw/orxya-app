import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { getQueued } from '@/lib/localdb/dexie'
import { flushQueueOnce } from '@/lib/sync'
import * as SentryCap from '@sentry/capacitor'
import { track } from '@/lib/telemetry'

const Diagnostics = () => {
  const { user } = useUser()
  const [audit, setAudit] = useState<any[]>([])
  const [queuedItems, setQueuedItems] = useState<any[]>([])
  const [ping, setPing] = useState<'ok' | 'fail' | 'idle'>('idle')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

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

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">التشخيص</h1>

      {/* System Status */}
      <div className="p-4 bg-white border rounded-2xl space-y-3">
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
      <div className="p-4 bg-white border rounded-2xl">
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

      {/* Test Buttons */}
      <div className="p-4 bg-white border rounded-2xl">
        <h2 className="font-semibold text-lg mb-3">أزرار الاختبار</h2>
        <div className="flex gap-2 flex-wrap">
          <button 
            className="btn max-w-xs" 
            onClick={() => { 
              try { 
                throw new Error('Oryxa test error'); 
              } catch (e) { 
                SentryCap.captureException(e); 
              } 
            }}
          >
            Throw test error (Sentry)
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
      <div className="p-4 bg-white border rounded-2xl">
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
