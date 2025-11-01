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

  async function handleGoogleSignIn() {
    setLoading(true); setErr(null); setMsg(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      if (error) throw error
    } catch (e: any) {
      setErr(e?.message ?? 'فشل تسجيل الدخول بـ Google')
      setLoading(false)
    }
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

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">أو</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg border-2 border-border bg-background hover:bg-accent transition-colors disabled:opacity-50 font-medium flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'جاري المعالجة…' : 'تسجيل الدخول بـ Google'}
        </button>

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
