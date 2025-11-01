import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'

const Diagnostics = () => {
  const { user } = useUser()
  const [audit, setAudit] = useState<any[]>([])
  const [ping, setPing] = useState<'ok' | 'fail' | 'idle'>('idle')

  useEffect(() => {
    (async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1)
        setPing(error ? 'fail' : 'ok')
      } catch {
        setPing('fail')
      }
      if (user) {
        const { data } = await supabase
          .from('command_audit')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5)
        setAudit(data ?? [])
      } else {
        setAudit([])
      }
    })()
  }, [user?.id])

  return (
    <div className="p-4 space-y-3 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">التشخيص</h1>
      
      <div className="p-4 bg-white border rounded-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">SUPABASE_URL:</span>
          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
            {import.meta.env.VITE_SUPABASE_URL ? '✅ set' : '❌ missing'}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Ping DB:</span>
          <code className={`text-xs px-2 py-1 rounded ${
            ping === 'ok' ? 'bg-green-100 text-green-800' :
            ping === 'fail' ? 'bg-red-100 text-red-800' :
            'bg-gray-100'
          }`}>
            {ping}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium">Session:</span>
          <code className={`text-xs px-2 py-1 rounded ${
            user ? 'bg-green-100 text-green-800' : 'bg-gray-100'
          }`}>
            {user ? '✅ yes' : '❌ no'}
          </code>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <span className="font-medium">User ID:</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
              {user.id}
            </code>
          </div>
        )}
      </div>

      <div className="p-3 bg-white border rounded-2xl">
        <div className="font-medium mb-2">آخر 5 أوامر</div>
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد أوامر محفوظة</p>
        ) : (
          <pre className="text-xs overflow-auto max-h-96">
            {JSON.stringify(audit, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

export default Diagnostics
