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
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  useEffect(() => {
    if (user) navigate('/projects')
  }, [user, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/projects')
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: redirectTo }
        })
        if (error) throw error
        setMsg('✅ تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...')
        setTimeout(() => navigate('/projects'), 1000)
      }
    } catch (e: any) {
      setErr(e?.message ?? 'حدث خطأ')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-xl shadow-2xl border">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'أدخل بريدك وكلمة المرور' : 'سجل حساب جديد'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="block space-y-2">
            <span className="text-sm font-medium">كلمة المرور</span>
            <input
              className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-primary transition-shadow"
              type="password"
              required
              dir="ltr"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
            />
          </label>
          <button 
            className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium shadow-lg" 
            disabled={loading}
          >
            {loading ? 'جاري المعالجة…' : mode === 'signin' ? '🚀 دخول' : '✨ إنشاء حساب'}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'signin' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب؟ سجل الدخول'}
          </button>
        </div>

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
