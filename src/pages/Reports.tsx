import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'

const Reports = () => {
  const { user } = useUser()
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [res, setRes] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)

  async function fetchReport(d: string) {
    setLoading(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const jwt = sess?.session?.access_token
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/report-daily?date=${d}`
      const r = await fetch(url, { headers: { Authorization: `Bearer ${jwt}` } })
      const j = await r.json()
      setRes(j)
    } catch (e) {
      setRes({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">التقارير</h1>
      
      {!user && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-3 rounded-lg">
          سجّل الدخول لعرض التقارير المباشرة.
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
        <button
          className="btn max-w-xs"
          onClick={() => fetchReport(date)}
          disabled={loading}
        >
          {loading ? 'جاري التحميل...' : 'عرض التقرير'}
        </button>
      </div>
      
      <pre className="p-4 bg-white border rounded-2xl overflow-auto text-xs max-h-96">
        {res ? JSON.stringify(res, null, 2) : '—'}
      </pre>
    </div>
  )
}

export default Reports
