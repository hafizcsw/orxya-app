import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (hasError) return; // Don't navigate if there's an error
    
    console.log('[Index] State:', { user: !!user, loading, isNavigating, currentPath: window.location.pathname })
    
    if (!loading && !isNavigating) {
      try {
        // Timeout to prevent race conditions
        const timeout = setTimeout(() => {
          const currentPath = window.location.pathname;
          
          // Don't redirect if already on index
          if (currentPath === '/') {
            if (user) {
              console.log('[Index] ✅ User found, redirecting to /today')
              setIsNavigating(true);
              navigate('/today', { replace: true });
            } else {
              console.log('[Index] ❌ No user, redirecting to /auth')
              setIsNavigating(true);
              navigate('/auth', { replace: true });
            }
          } else {
            console.log('[Index] Already navigated away from index, skipping redirect')
          }
        }, 300);
        
        return () => clearTimeout(timeout);
      } catch (error) {
        console.error('[Index] Navigation error:', error);
        setHasError(true);
        // Fallback: try to navigate to auth
        navigate('/auth', { replace: true });
      }
    }
  }, [user, loading, navigate, isNavigating, hasError]);

  if (hasError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">حدث خطأ في التوجيه</h2>
          <p className="text-muted-foreground">جارٍ إعادة المحاولة...</p>
          <button
            onClick={() => {
              setHasError(false);
              setIsNavigating(false);
              navigate('/auth', { replace: true });
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            الذهاب لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export default Index;
