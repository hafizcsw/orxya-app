import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    console.log('[AuthCallback] Starting OAuth callback handling...')
    
    let timeout: NodeJS.Timeout
    
    // استمع لتغييرات حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthCallback] Auth state changed:', event, session?.user ? 'User found' : 'No user')
      
      if (event === 'SIGNED_IN' && session) {
        console.log('[AuthCallback] Sign in successful, redirecting to /today')
        navigate('/today', { replace: true })
      } else if (event === 'USER_UPDATED' && session) {
        console.log('[AuthCallback] User updated, redirecting to /today')
        navigate('/today', { replace: true })
      }
    })
    
    // تحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthCallback] Session error:', error)
        setError('فشل تسجيل الدخول')
        setTimeout(() => navigate('/auth', { replace: true }), 2000)
        return
      }
      
      if (session) {
        console.log('[AuthCallback] Session found, redirecting to /today')
        navigate('/today', { replace: true })
      } else {
        console.log('[AuthCallback] No session yet, waiting for auth state change...')
      }
    })
    
    // Timeout للتعامل مع الحالات البطيئة
    timeout = setTimeout(() => {
      console.warn('[AuthCallback] Timeout reached, redirecting to /auth')
      setError('انتهت المهلة')
      navigate('/auth', { replace: true })
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
