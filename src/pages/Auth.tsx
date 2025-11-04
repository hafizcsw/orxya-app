import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Calendar } from 'lucide-react'

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
  const [hasNavigated, setHasNavigated] = useState(false)

  useEffect(() => {
    // Only redirect if user is logged in and we haven't navigated yet
    // and we're not in the middle of a login/signup operation
    if (user && !hasNavigated && !loading) {
      console.log('[Auth] User already logged in, redirecting to /today')
      setHasNavigated(true)
      
      // Small delay to prevent navigation loops
      setTimeout(() => {
        navigate('/today', { replace: true })
      }, 100)
    }
  }, [user, navigate, hasNavigated, loading])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        console.log('[Auth] Sign in successful')
        // Navigation will happen automatically via useEffect when user state changes
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: redirectTo }
        })
        if (error) throw error
        setMsg('✅ تم إنشاء الحساب بنجاح! جاري تسجيل الدخول...')
        console.log('[Auth] Sign up successful')
        // Navigation will happen automatically via useEffect when user state changes
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      
      {/* Animated Blobs */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-float" style={{ animationDelay: '2s' }} />
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className={cn(
          "w-full max-w-md",
          "bg-card/80 backdrop-blur-xl",
          "border border-border/50",
          "rounded-3xl shadow-2xl",
          "p-8 md:p-10"
        )}>
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Oryxa
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              منظّم حياتك الذكي
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="peer w-full px-4 py-3 rounded-xl border border-input bg-background/50 backdrop-blur text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-transparent"
                placeholder="البريد الإلكتروني"
                required
                dir="ltr"
                autoFocus
              />
              <label className="absolute right-4 -top-6 text-sm text-muted-foreground peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-6 peer-focus:text-sm peer-focus:text-primary transition-all">
                البريد الإلكتروني
              </label>
            </div>
            
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="peer w-full px-4 py-3 rounded-xl border border-input bg-background/50 backdrop-blur text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder-transparent"
                placeholder="كلمة المرور"
                required
                dir="ltr"
                minLength={6}
              />
              <label className="absolute right-4 -top-6 text-sm text-muted-foreground peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-6 peer-focus:text-sm peer-focus:text-primary transition-all">
                كلمة المرور
              </label>
            </div>
            
            <button 
              type="submit" 
              className="btn-futuristic btn-gradient w-full"
              disabled={loading}
            >
              {loading && <div className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />}
              {loading ? 'جاري المعالجة…' : mode === 'signin' ? '🚀 دخول' : '✨ إنشاء حساب'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-card/80 backdrop-blur text-muted-foreground">أو</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-ghost-glow w-full flex items-center justify-center gap-3"
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
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === 'signin' ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب؟ سجل الدخول'}
            </button>
          </div>

          {msg && (
            <div className="p-4 rounded-xl bg-success/10 border border-success/30 backdrop-blur">
              <p className="text-sm font-medium text-success">{msg}</p>
              <p className="text-xs mt-1 text-success/80">لو ما وصلك، تحقق من مجلد Spam</p>
            </div>
          )}
          
          {err && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 backdrop-blur">
              <p className="text-sm font-medium text-destructive">{err}</p>
            </div>
          )}

          <div className="text-center pt-2">
            <button 
              onClick={() => navigate('/')} 
              className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <span>←</span> العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
