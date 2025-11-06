import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('[AuthCallback] Component mounted')
    console.log('[AuthCallback] Current URL:', window.location.href)
    
    let hasNavigated = false // Flag to prevent duplicate navigation
    let timeout: NodeJS.Timeout
    
    const handleSuccessfulAuth = async (session: any) => {
      if (hasNavigated) {
        console.log('[AuthCallback] Already navigated, skipping')
        return
      }
      
      hasNavigated = true
      console.log('[AuthCallback] ✅ Authentication successful')
      console.log('[AuthCallback] User:', session.user.email)
      
      // Small delay to ensure everything is complete
      await new Promise(resolve => setTimeout(resolve, 300))
      
      console.log('[AuthCallback] Navigating to /today')
      navigate('/today', { replace: true })
    }
    
    // 1. Check current session first
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthCallback] Session error:', error)
        setError('فشل تسجيل الدخول')
        setTimeout(() => navigate('/auth', { replace: true }), 2000)
        return
      }
      
      if (session) {
        console.log('[AuthCallback] Session found immediately')
        handleSuccessfulAuth(session)
      } else {
        console.log('[AuthCallback] No session yet, waiting...')
      }
    })
    
    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Event:', event, session ? '✅' : '❌')
      
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session) {
        handleSuccessfulAuth(session)
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[AuthCallback] Signed out, redirecting to /auth')
        navigate('/auth', { replace: true })
      }
    })
    
    // 3. Timeout protection
    timeout = setTimeout(() => {
      if (!hasNavigated) {
        console.warn('[AuthCallback] ⏱️ Timeout - no session after 10s')
        setError('انتهت المهلة - جاري إعادة المحاولة')
        navigate('/auth', { replace: true })
      }
    }, 10000)
    
    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [navigate])
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        {error ? (
          <>
            <p className="text-red-600 font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">جاري إعادة التوجيه...</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">جاري إتمام تسجيل الدخول…</p>
          </>
        )}
      </div>
    </div>
  )
}
