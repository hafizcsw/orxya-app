import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { z } from 'zod'

const passwordSchema = z.string()
  .min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
  .max(72, 'كلمة المرور طويلة جداً')
  .regex(/^(?=.*[a-z])/, 'يجب أن تحتوي على حرف صغير واحد على الأقل')
  .regex(/^(?=.*[A-Z])/, 'يجب أن تحتوي على حرف كبير واحد على الأقل')
  .regex(/^(?=.*\d)/, 'يجب أن تحتوي على رقم واحد على الأقل');

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
  const [validToken, setValidToken] = useState(false)

  useEffect(() => {
    // Check if we have a valid recovery token
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidToken(true)
      } else {
        toast({
          title: 'رابط غير صالح',
          description: 'الرجاء طلب رابط إعادة تعيين جديد',
          variant: 'destructive',
        })
        navigate('/auth')
      }
    }
    checkSession()
  }, [navigate])

  const validateForm = (): boolean => {
    setErrors({})
    
    try {
      passwordSchema.parse(password)
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ password: error.issues[0].message })
        toast({
          title: 'خطأ في كلمة المرور',
          description: error.issues[0].message,
          variant: 'destructive',
        })
        return false
      }
    }

    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'كلمات المرور غير متطابقة' })
      toast({
        title: 'خطأ',
        description: 'كلمات المرور غير متطابقة',
        variant: 'destructive',
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      
      if (error) throw error
      
      toast({
        title: 'تم تحديث كلمة المرور ✅',
        description: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة',
      })
      
      // Sign out and redirect to login
      await supabase.auth.signOut()
      setTimeout(() => {
        navigate('/auth', { replace: true })
      }, 1000)
    } catch (error: any) {
      console.error('[ResetPassword] Error:', error)
      
      let errorMessage = 'فشل تحديث كلمة المرور'
      if (error?.message?.includes('session')) {
        errorMessage = 'انتهت صلاحية الرابط. الرجاء طلب رابط جديد'
      }
      
      toast({
        title: 'خطأ',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">جاري التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0 auth-grid-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      <div className="absolute inset-0 opacity-[0.015] bg-noise" />
      
      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              إعادة تعيين كلمة المرور
            </h1>
            <p className="text-zinc-400">
              أدخل كلمة المرور الجديدة
            </p>
          </div>

          <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setErrors(prev => ({ ...prev, password: undefined }))
                    }}
                    className={cn(
                      "w-full px-4 py-3 pr-12 rounded-xl bg-black/50 border text-white transition-all outline-none",
                      errors.password 
                        ? "border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20" 
                        : "border-zinc-700 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20"
                    )}
                    required
                    dir="ltr"
                    autoFocus
                    autoComplete="new-password"
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
                {password && !errors.password && (
                  <div className="space-y-1 text-xs">
                    <div className={cn(
                      "flex items-center gap-2",
                      password.length >= 6 ? "text-green-400" : "text-zinc-500"
                    )}>
                      {password.length >= 6 ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
                      <span>6 أحرف على الأقل</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2",
                      /[a-z]/.test(password) ? "text-green-400" : "text-zinc-500"
                    )}>
                      {/[a-z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
                      <span>حرف صغير واحد على الأقل</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2",
                      /[A-Z]/.test(password) ? "text-green-400" : "text-zinc-500"
                    )}>
                      {/[A-Z]/.test(password) ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
                      <span>حرف كبير واحد على الأقل</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-2",
                      /\d/.test(password) ? "text-green-400" : "text-zinc-500"
                    )}>
                      {/\d/.test(password) ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-zinc-600" />}
                      <span>رقم واحد على الأقل</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">تأكيد كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setErrors(prev => ({ ...prev, confirmPassword: undefined }))
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
                {confirmPassword && password === confirmPassword && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>كلمات المرور متطابقة</span>
                  </div>
                )}
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
                    <span>جاري التحديث...</span>
                  </>
                ) : (
                  <>
                    <span>تحديث كلمة المرور</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
