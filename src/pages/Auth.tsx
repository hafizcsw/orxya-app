import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/lib/auth'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Mail, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

const SITE_URL = import.meta.env.VITE_SITE_URL ?? 'https://can-you-build-me.lovable.app'
const redirectTo = `${SITE_URL}/auth/callback`

// Validation schemas
const emailSchema = z.string()
  .trim()
  .min(1, 'البريد الإلكتروني مطلوب')
  .email('البريد الإلكتروني غير صحيح')
  .max(255, 'البريد الإلكتروني طويل جداً');

const passwordSchema = z.string()
  .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  .max(72, 'كلمة المرور طويلة جداً')
  .regex(/^(?=.*[a-z])/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/^(?=.*[A-Z])/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/^(?=.*\d)/, 'يجب أن تحتوي على رقم واحد على الأقل');

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

export default function Auth() {
  const { user } = useUser()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({})
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  )
  const [hasNavigated, setHasNavigated] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)

  useEffect(() => {
    // Debug info
    console.group('🔍 Auth Debug Info')
    console.log('Current URL:', window.location.href)
    console.log('Origin:', window.location.origin)
    console.log('Site URL:', SITE_URL)
    console.log('Redirect To:', redirectTo)
    console.log('User:', user ? '✅ Logged in' : '❌ Not logged in')
    console.log('Has Navigated:', hasNavigated)
    console.log('Loading:', loading)
    console.groupEnd()

    // Only redirect if user is logged in and we haven't navigated yet
    if (user && !hasNavigated && !loading) {
      console.log('[Auth] ✅ Redirecting to /today...')
      setHasNavigated(true)
      setTimeout(() => {
        navigate('/today', { replace: true })
      }, 500)
    }
  }, [user, navigate, hasNavigated, loading])

  const validateForm = (): boolean => {
    setErrors({});
    
    try {
      if (mode === 'signin') {
        signInSchema.parse({ email, password });
      } else {
        signUpSchema.parse({ email, password, confirmPassword });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { email?: string; password?: string; confirmPassword?: string } = {};
        error.issues.forEach((issue) => {
          const path = issue.path[0] as 'email' | 'password' | 'confirmPassword';
          if (!fieldErrors[path]) {
            fieldErrors[path] = issue.message;
          }
        });
        setErrors(fieldErrors);
        
        // Show toast with first error
        const firstError = error.issues[0];
        toast({
          title: 'خطأ في البيانات المدخلة',
          description: firstError.message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true)
    console.log('[Auth] Submitting form:', { mode, email })
    
    try {
      if (mode === 'signin') {
        console.log('[Auth] Signing in with password...')
        const { error } = await supabase.auth.signInWithPassword({ 
          email: email.trim(), 
          password 
        })
        if (error) throw error
        
        console.log('[Auth] ✅ Sign in successful')
        toast({ title: 'تم تسجيل الدخول بنجاح ✅' })
        
        await new Promise(resolve => setTimeout(resolve, 300))
        setShowEmailDialog(false)
      } else {
        console.log('[Auth] Signing up...')
        const { error } = await supabase.auth.signUp({ 
          email: email.trim(), 
          password,
          options: { 
            emailRedirectTo: redirectTo,
            data: {
              email_confirmed: true // Auto-confirm for development
            }
          }
        })
        if (error) throw error
        
        console.log('[Auth] ✅ Sign up successful')
        toast({ 
          title: 'تم إنشاء الحساب بنجاح ✅',
          description: 'يمكنك الآن تسجيل الدخول'
        })
        
        await new Promise(resolve => setTimeout(resolve, 300))
        setShowEmailDialog(false)
        setMode('signin')
      }
    } catch (e: any) {
      console.error('[Auth] ❌ Error:', e);
      
      // User-friendly error messages
      let errorMessage = 'حدث خطأ غير متوقع';
      let errorTitle = mode === 'signin' ? 'فشل تسجيل الدخول' : 'فشل إنشاء الحساب';
      
      if (e?.message?.includes('Invalid login credentials')) {
        errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
      } else if (e?.message?.includes('Email not confirmed')) {
        errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
        errorTitle = 'البريد الإلكتروني غير مؤكد';
      } else if (e?.message?.includes('User already registered')) {
        errorMessage = 'البريد الإلكتروني مستخدم بالفعل. جرب تسجيل الدخول';
      } else if (e?.message?.includes('Password should be')) {
        errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      } else if (e?.message?.includes('Invalid email')) {
        errorMessage = 'البريد الإلكتروني غير صحيح';
      } else if (e?.message?.includes('Network')) {
        errorMessage = 'خطأ في الاتصال بالإنترنت';
        errorTitle = 'مشكلة في الاتصال';
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally { 
      setLoading(false) 
    }
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
      console.error('[Auth] Exception:', e);
      
      let errorMessage = 'فشل تسجيل الدخول عبر Google';
      if (e?.message?.includes('popup')) {
        errorMessage = 'تم إغلاق نافذة تسجيل الدخول. حاول مرة أخرى';
      } else if (e?.message?.includes('network')) {
        errorMessage = 'خطأ في الاتصال بالإنترنت';
      }
      
      toast({ 
        title: 'خطأ في Google', 
        description: errorMessage, 
        variant: "destructive" 
      });
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
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                className={cn(
                  "w-full px-4 py-3 rounded-xl bg-black/50 border text-white transition-all outline-none",
                  errors.email 
                    ? "border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20" 
                    : "border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                )}
                required
                dir="ltr"
                autoFocus
                autoComplete="email"
                placeholder="you@example.com"
              />
              {errors.email && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </div>
              )}
            </div>
            
            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  className={cn(
                    "w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border text-white transition-all outline-none",
                    errors.password 
                      ? "border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20" 
                      : "border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                  )}
                  required
                  dir="ltr"
                  autoComplete={mode === 'signin' ? "current-password" : "new-password"}
                  minLength={6}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </div>
              )}
              {mode === 'signup' && !errors.password && password && (
                <div className="space-y-1 text-xs">
                  <div className={cn(
                    "flex items-center gap-2",
                    password.length >= 6 ? "text-green-400" : "text-zinc-500"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      password.length >= 6 ? "bg-green-400" : "bg-zinc-600"
                    )} />
                    <span>6 أحرف على الأقل</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2",
                    /[a-z]/.test(password) ? "text-green-400" : "text-zinc-500"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      /[a-z]/.test(password) ? "bg-green-400" : "bg-zinc-600"
                    )} />
                    <span>حرف صغير واحد على الأقل</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2",
                    /[A-Z]/.test(password) ? "text-green-400" : "text-zinc-500"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      /[A-Z]/.test(password) ? "bg-green-400" : "bg-zinc-600"
                    )} />
                    <span>حرف كبير واحد على الأقل</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2",
                    /\d/.test(password) ? "text-green-400" : "text-zinc-500"
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      /\d/.test(password) ? "bg-green-400" : "bg-zinc-600"
                    )} />
                    <span>رقم واحد على الأقل</span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field (Signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">{t('signup.confirmPassword')}</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                    }}
                    className={cn(
                      "w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border text-white transition-all outline-none",
                      errors.confirmPassword 
                        ? "border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20" 
                        : "border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                    )}
                    required
                    dir="ltr"
                    autoComplete="new-password"
                    minLength={6}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.confirmPassword}</span>
                  </div>
                )}
              </div>
            )}
            
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
