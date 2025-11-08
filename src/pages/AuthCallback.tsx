import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('[AuthCallback] Component mounted')
    console.log('[AuthCallback] Current URL:', window.location.href)
    
    let hasNavigated = false
    let timeout: NodeJS.Timeout
    
    const handleSuccessfulAuth = async (session: any) => {
      if (hasNavigated) {
        console.log('[AuthCallback] Already navigated, skipping')
        return
      }
      
      hasNavigated = true
      console.log('[AuthCallback] ✅ Authentication successful')
      console.log('[AuthCallback] User:', session.user.email)
      
      // Clean URL and redirect
      const cleanUrl = window.location.origin + '/today'
      window.history.replaceState({}, '', cleanUrl)
      
      await new Promise(resolve => setTimeout(resolve, 300))
      navigate('/today', { replace: true })
    }
    
    const handleAuthError = (error: any) => {
      console.error('[AuthCallback] Auth error:', error)
      setError('فشل تسجيل الدخول')
      setTimeout(() => {
        window.location.assign('/auth?error=callback')
      }, 2000)
    }
    
    // 1. Try to exchange code for session if present in URL
    const handleCodeExchange = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      
      if (code) {
        try {
          console.log('[AuthCallback] Exchanging code for session')
          const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          
          if (error) throw error
          if (data.session) {
            await handleSuccessfulAuth(data.session)
            return true
          }
        } catch (e) {
          console.error('[AuthCallback] Code exchange failed:', e)
          handleAuthError(e)
          return true
        }
      }
      return false
    }
    
    // 2. Check current session
    const checkSession = async () => {
      const codeExchanged = await handleCodeExchange()
      if (codeExchanged) return
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        handleAuthError(error)
        return
      }
      
      if (session) {
        console.log('[AuthCallback] Session found')
        await handleSuccessfulAuth(session)
      } else {
        console.log('[AuthCallback] No session yet, waiting...')
      }
    }
    
    checkSession()
    
    // 3. Listen for auth state changes
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
    
    // 4. Timeout protection
    timeout = setTimeout(() => {
      if (!hasNavigated) {
        console.warn('[AuthCallback] ⏱️ Timeout - no session after 10s')
        handleAuthError(new Error('Timeout'))
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
