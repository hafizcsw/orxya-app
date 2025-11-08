import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    console.log('[Index] State:', { user: !!user, loading, isNavigating, currentPath: window.location.pathname })
    
    if (!loading && !isNavigating) {
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
    }
  }, [user, loading, navigate, isNavigating]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export default Index;
