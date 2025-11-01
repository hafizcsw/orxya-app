import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // انتظر اكتمال معالجة الجلسة من URL hash
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('فشل تسجيل الدخول')
          setTimeout(() => navigate('/auth'), 2000)
          return
        }
        
        if (session) {
          // الجلسة موجودة، توجه للصفحة الرئيسية
          navigate('/today', { replace: true })
        } else {
          // لا توجد جلسة، ارجع لصفحة تسجيل الدخول
          setTimeout(() => navigate('/auth', { replace: true }), 1000)
        }
      } catch (err) {
        console.error('Callback error:', err)
        setError('حدث خطأ')
        setTimeout(() => navigate('/auth'), 2000)
      }
    }
    
    handleCallback()
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
