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
    if (user) navigate('/today')
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
      setMsg('تم إرسال رابط الدخول إلى بريدك 📩')
    } catch (e: any) {
      setErr(e?.message ?? 'تعذر الإرسال')
    } finally { setLoading(false) }
  }

  async function signInGoogle() {
    setErr(null); setMsg(null)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-center">تسجيل الدخول</h1>

        <form onSubmit={signInEmail} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">البريد الإلكتروني</span>
            <input
              className="w-full px-4 py-2 rounded-lg border border-input bg-background text-foreground"
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button 
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium" 
            disabled={loading}
          >
            {loading ? 'جاري الإرسال…' : 'أرسل رابط الدخول'}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">أو</span>
          </div>
        </div>

        <button 
          onClick={signInGoogle} 
          className="w-full px-4 py-3 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors font-medium"
        >
          متابعة عبر Google
        </button>

        {msg && <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100 text-sm">{msg}</div>}
        {err && <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-100 text-sm">{err}</div>}
      </div>
    </div>
  )
}
