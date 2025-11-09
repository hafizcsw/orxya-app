import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading } = useUser();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (loading || hasNavigated.current) return;

    const target = user ? '/today' : '/auth';
    if (pathname !== target) {
      hasNavigated.current = true;
      navigate(target, { replace: true });
    }
  }, [user, loading, pathname, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
