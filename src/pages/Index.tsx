import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!loading && !isNavigating) {
      // Longer timeout to prevent race conditions
      const timeout = setTimeout(() => {
        const currentPath = window.location.pathname;
        
        if (user) {
          // Don't navigate if already on the target page
          if (currentPath !== '/today') {
            console.log('[Index] User found, redirecting to /today')
            setIsNavigating(true);
            navigate('/today', { replace: true });
          }
        } else {
          // Don't navigate if already on auth page
          if (currentPath !== '/auth') {
            console.log('[Index] No user, redirecting to /auth')
            setIsNavigating(true);
            navigate('/auth', { replace: true });
          }
        }
      }, 200);
      
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
