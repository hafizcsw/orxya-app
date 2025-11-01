import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { genIdem } from '@/lib/sync'
import { useUser } from '@/lib/auth'
import { Toast } from '@/components/Toast'
import { track } from '@/lib/telemetry'

const Automation = () => {
  const { user } = useUser()
  const [rows, setRows] = useState<any[]>([])
  const [toast, setToast] = useState<string | null>(null)

  async function load() {
    if (!user) return setRows([])
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (!error) setRows(data ?? [])
  }

  useEffect(() => { load() }, [user?.id])

  async function saveDefaults() {
    try {
      const body = (label: string, time_local: string) => ({
        command: 'set_alarm',
        idempotency_key: genIdem(),
        payload: { label, time_local }
      })
      await supabase.functions.invoke('commands', { body: body('Morning Plan', '08:00') })
      await supabase.functions.invoke('commands', { body: body('Daily Check-in', '21:30') })
      setToast('تم الحفظ ✅')
      track('automation_saved_defaults', { count: 2 })
      load()
    } catch {
      setToast('تعذّر الحفظ الآن — جرّب لاحقًا')
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">الأتمتة والتذكيرات</h1>
      
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
      
      {toast && <Toast msg={toast} />}
    </div>
  )
}

export default Automation
