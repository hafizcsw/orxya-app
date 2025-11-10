import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/auth';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading } = useUser();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading || hasNavigated.current) return;

    // Auto-redirect authenticated users only
    if (user && pathname === '/') {
      hasNavigated.current = true;
      navigate('/today', { replace: true });
    }
  }, [user, loading, pathname, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show welcome screen for unauthenticated users
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo/Brand */}
          <div className="space-y-3">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">مرحباً بك</h1>
            <p className="text-muted-foreground text-lg">
              ابدأ رحلتك في تتبع أهدافك اليومية
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            <Button
              onClick={() => navigate('/auth?mode=signup')}
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-3"
            >
              <UserPlus className="w-5 h-5" />
              إنشاء حساب جديد
            </Button>
            
            <Button
              onClick={() => navigate('/auth?mode=login')}
              variant="outline"
              size="lg"
              className="w-full h-14 text-lg font-semibold gap-3"
            >
              <LogIn className="w-5 h-5" />
              تسجيل الدخول
            </Button>
          </div>

          {/* Features Preview */}
          <div className="pt-8 space-y-4">
            <p className="text-sm text-muted-foreground">ميزات التطبيق:</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl">📊</div>
                <p className="text-xs text-muted-foreground">تتبع الأنشطة</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl">💪</div>
                <p className="text-xs text-muted-foreground">الصحة واللياقة</p>
              </div>
              <div className="space-y-1">
                <div className="text-2xl">📅</div>
                <p className="text-xs text-muted-foreground">إدارة الوقت</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state during navigation
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
