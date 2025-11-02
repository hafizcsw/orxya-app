import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';
import Spinner from '@/components/ui/Spinner';

export default function OAuthGoogleCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('جارٍ ربط حساب Google...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          setStatus('error');
          setMessage(`فشل التفويض: ${error}`);
          track('oauth_google_error', { error });
          setTimeout(() => navigate('/profile'), 3000);
          return;
        }

        if (!code || !state) {
          setStatus('error');
          setMessage('معاملات غير مكتملة');
          setTimeout(() => navigate('/profile'), 3000);
          return;
        }

        const expectedState = localStorage.getItem('g_oauth_state');
        if (state !== expectedState) {
          setStatus('error');
          setMessage('حالة OAuth غير صحيحة');
          track('oauth_google_state_mismatch');
          setTimeout(() => navigate('/profile'), 3000);
          return;
        }

        // استدعاء callback مع الكود
        const { error: callbackError } = await supabase.functions.invoke('oauth-gcal-callback', {
          body: { code },
        });

        if (callbackError) {
          throw callbackError;
        }

        localStorage.removeItem('g_oauth_state');
        setStatus('success');
        setMessage('تم الربط بنجاح! ✅');
        track('oauth_google_connected');

        setTimeout(() => navigate('/profile'), 2000);
      } catch (e: any) {
        console.error('OAuth callback error:', e);
        setStatus('error');
        setMessage(e?.message ?? 'حدث خطأ أثناء الربط');
        track('oauth_google_callback_error', { error: e?.message });
        setTimeout(() => navigate('/profile'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        {status === 'processing' && (
          <>
            <Spinner />
            <p className="text-lg text-foreground">{message}</p>
          </>
        )}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-6xl">✅</div>
            <p className="text-xl font-medium text-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">جارٍ التحويل إلى الإعدادات...</p>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-6xl">❌</div>
            <p className="text-xl font-medium text-destructive">{message}</p>
            <p className="text-sm text-muted-foreground">جارٍ التحويل إلى الإعدادات...</p>
          </div>
        )}
      </div>
    </div>
  );
}
