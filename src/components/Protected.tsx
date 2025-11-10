import { PropsWithChildren, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Link } from 'react-router-dom'

export function Protected({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()
  const [showError, setShowError] = useState(false)
  
  // Timeout to prevent eternal spinning
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setShowError(true)
      }, 10000) // ✅ زيادة من 5 إلى 10 ثوانٍ
      
      return () => clearTimeout(timeout)
    } else {
      setShowError(false) // ✅ إعادة تعيين عند انتهاء التحميل
    }
  }, [loading])
  
  if (loading && !showError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (loading && showError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 bg-card p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold">خطأ في التحميل</h2>
          <p className="text-muted-foreground">
            فشل تحميل بيانات المستخدم. يرجى المحاولة مرة أخرى.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-block px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 bg-card p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold">مطلوب تسجيل الدخول</h2>
          <p className="text-muted-foreground">
            تحتاج لتسجيل الدخول لعرض هذه الصفحة.
          </p>
          <Link 
            to="/auth" 
            className="inline-block px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            اذهب لصفحة الدخول
          </Link>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}
