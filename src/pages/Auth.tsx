import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin
const redirectTo = `${siteUrl}/auth/callback`

export default function Auth() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate('/projects')
  }, [user, navigate])

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      })
      if (error) throw error
      setMsg('✅ تم إرسال رابط الدخول إلى بريدك. تحقق من صندوق الوارد.')
    } catch (e: any) {
      setErr(e?.message ?? 'تعذر الإرسال')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl shadow-2xl border">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">تسجيل الدخول</h1>
          <p className="text-sm text-muted-foreground">أدخل بريدك للحصول على رابط دخول فوري</p>
        </div>

        <form onSubmit={signInEmail} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">البريد الإلكتروني</span>
            <input
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary transition-shadow"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="your@email.com"
              autoFocus
            />
          </label>
          <button 
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium shadow-lg" 
            disabled={loading}
          >
            {loading ? 'جاري الإرسال…' : '🚀 أرسل رابط الدخول'}
          </button>
        </form>

        {msg && (
          <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 border border-green-300 dark:border-green-700">
            <p className="text-sm font-medium">{msg}</p>
            <p className="text-xs mt-1">لو ما وصلك، تحقق من مجلد Spam</p>
          </div>
        )}
        
        {err && (
          <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700">
            <p className="text-sm font-medium">{err}</p>
          </div>
        )}

        <div className="text-center">
          <button 
            onClick={() => navigate('/')} 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← العودة للرئيسية
          </button>
        </div>
      </div>
    </div>
  )
}
