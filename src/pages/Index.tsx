import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading) {
      // Small timeout to prevent race condition with auth state changes
      const timeout = setTimeout(() => {
        if (user) {
          console.log('[Index] User found, redirecting to /today')
          navigate('/today', { replace: true });
        } else {
          console.log('[Index] No user, redirecting to /auth')
          navigate('/auth', { replace: true });
        }
      }, 50);
      
      return () => clearTimeout(timeout);
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
};

export default Index;
