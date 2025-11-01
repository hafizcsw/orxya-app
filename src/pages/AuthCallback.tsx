import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AuthCallback() {
  const navigate = useNavigate()
  
  useEffect(() => {
    // Supabase يعالج الجلسة تلقائياً من بارامترات URL
    // نمنح ثانية للتأكّد ثم نعيد التوجيه
    const t = setTimeout(() => navigate('/today'), 800)
    return () => clearTimeout(t)
  }, [navigate])
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">جاري إتمام تسجيل الدخول…</p>
      </div>
    </div>
  )
}
