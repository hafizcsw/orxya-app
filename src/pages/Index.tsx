import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuthAndRedirect = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;

        if (error) {
          console.error('Auth check error:', error);
          navigate('/auth', { replace: true });
          return;
        }

        // Small delay to prevent flash
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        if (user) {
          navigate('/today', { replace: true });
        } else {
          navigate('/auth', { replace: true });
        }
      } catch (err) {
        console.error('Navigation error:', err);
        if (mounted) {
          navigate('/auth', { replace: true });
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkAuthAndRedirect();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (!isChecking) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default Index;
