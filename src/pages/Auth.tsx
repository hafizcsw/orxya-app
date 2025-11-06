import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Mail, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'

const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin
const redirectTo = `${siteUrl}/auth/callback`

export default function Auth() {
  const { user } = useUser()
  const navigate = useNavigate()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [hasNavigated, setHasNavigated] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  useEffect(() => {
    // Debug info
    console.group('🔍 Auth Debug Info')
    console.log('Current URL:', window.location.href)
    console.log('Origin:', window.location.origin)
    console.log('Site URL:', siteUrl)
    console.log('Redirect To:', redirectTo)
    console.log('User:', user ? '✅ Logged in' : '❌ Not logged in')
    console.groupEnd()

    // Only redirect if user is logged in and we haven't navigated yet
    if (user && !hasNavigated && !loading) {
      setHasNavigated(true)
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
        toast({ title: t('login.submit') + ' ✅' })
        setShowEmailDialog(false)
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: { emailRedirectTo: redirectTo }
        })
        if (error) throw error
        toast({ title: t('signup.submit') + ' ✅' })
        setShowEmailDialog(false)
      }
    } catch (e: any) {
      toast({ title: t('errors.loginFailed'), description: e?.message ?? t('errors.loginFailed'), variant: "destructive" })
    } finally { setLoading(false) }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    console.log('[Auth] Starting Google Sign-In')
    console.log('[Auth] Redirect URL:', redirectTo)
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: false, // Explicitly set
        }
      })
      
      console.log('[Auth] OAuth Response:', { data, error })
      
      if (error) {
        console.error('[Auth] OAuth Error:', error)
        throw error
      }
      
      console.log('[Auth] Redirecting to Google...')
      // Don't set loading to false here - page will redirect
    } catch (e: any) {
      console.error('[Auth] Exception:', e)
      toast({ title: t('errors.loginFailed'), description: e?.message ?? t('errors.loginFailed'), variant: "destructive" })
      setLoading(false) // Only on error
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* 3D Grid Background */}
      <div className="absolute inset-0 auth-grid-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] bg-noise" />
      
      {/* Skip Button */}
      <button 
        onClick={() => navigate('/today')} 
        className="absolute top-6 right-6 z-50 text-zinc-400 hover:text-white transition-colors text-sm font-medium"
      >
        {t('common:buttons.skip', { defaultValue: 'Skip' })} →
      </button>
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md animate-fadeInUp">
          {/* Logo Section */}
          <div className="text-center mb-12">
            <h1 className="text-7xl font-extrabold text-white mb-3 animate-pulse-slow tracking-tight">
              Oryxa
            </h1>
            <p className="text-lg text-zinc-400 font-mono">
              نظِّم حياتك بذكاء<span className="animate-blink">_</span>
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="space-y-4">
            {/* Google Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={cn(
                "group w-full py-5 px-6 rounded-2xl",
                "bg-gradient-to-r from-zinc-800 to-zinc-900",
                "border border-zinc-700",
                "hover:border-zinc-600 hover:from-zinc-700 hover:to-zinc-800",
                "transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                "flex items-center justify-center gap-4"
              )}
            >
              <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-white font-medium text-base">
                {loading ? t('common:buttons.loading') : 'Google'}
              </span>
            </button>

            {/* Email Button */}
            <button
              onClick={() => setShowEmailDialog(true)}
              disabled={loading}
              className={cn(
                "group w-full py-5 px-6 rounded-2xl",
                "bg-gradient-to-r from-zinc-800 to-zinc-900",
                "border border-zinc-700",
                "hover:border-zinc-600 hover:from-zinc-700 hover:to-zinc-800",
                "transition-all duration-300",
                "hover:scale-[1.02] hover:shadow-xl hover:shadow-white/5",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                "flex items-center justify-center gap-4"
              )}
            >
              <Mail className="w-6 h-6 text-zinc-400 group-hover:text-zinc-300 transition-colors" />
              <span className="text-white font-medium text-base">
                {t('login.email')}
              </span>
            </button>
          </div>

          {/* Legal Text */}
          <p className="text-center text-xs text-zinc-600 mt-12 px-4">
            بالمتابعة، أنت توافق على{' '}
            <button className="underline hover:text-zinc-400 transition-colors">الشروط</button>
            {' '}و{' '}
            <button className="underline hover:text-zinc-400 transition-colors">سياسة الخصوصية</button>
          </p>
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {mode === 'signin' ? t('login.title') : t('signup.title')}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-zinc-700 text-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-all outline-none"
                required
                dir="ltr"
                autoFocus
                placeholder="you@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">{t('login.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-zinc-700 text-white focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 transition-all outline-none"
                required
                dir="ltr"
                minLength={6}
                placeholder="••••••••"
              />
            </div>
            
            <button 
              type="submit" 
              className={cn(
                "w-full py-3.5 px-6 rounded-xl font-medium",
                "bg-white text-black",
                "hover:bg-zinc-200",
                "transition-all duration-200",
                "hover:scale-[1.02]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                "flex items-center justify-center gap-2"
              )}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{t('common:buttons.loading')}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signin' ? t('login.submit') : t('signup.submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2">
            <button 
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {mode === 'signin' ? t('login.noAccount') + ' ' + t('signup.signupLink') : t('signup.haveAccount') + ' ' + t('login.loginLink')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
