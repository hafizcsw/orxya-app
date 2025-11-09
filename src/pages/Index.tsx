import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;

    // Navigate based on authentication state
    if (user) {
      navigate('/today', { replace: true });
    } else {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
