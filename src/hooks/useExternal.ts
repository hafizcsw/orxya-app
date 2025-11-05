import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';

export type ExternalStatus = 'disconnected' | 'pending' | 'connected' | 'error';

export function useGoogleAccount() {
  const [status, setStatus] = useState<ExternalStatus>('disconnected');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;
    if (!uid) { setStatus('disconnected'); return; }
    const { data } = await supabase
      .from('external_accounts')
      .select('status,last_sync_at')
      .eq('owner_id', uid)
      .eq('provider', 'google')
      .maybeSingle();
    setStatus((data?.status as ExternalStatus) ?? 'disconnected');
    setLastSyncAt(data?.last_sync_at ?? null);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function connect() {
    setLoading(true);
    try {
      track('gcal_connect_clicked');
      const r = await supabase.functions.invoke('oauth-gcal-start', { body: {} });
      
      if (r.error) {
        console.error('Google connect error:', r.error);
        track('gcal_connect_error', { error: r.error.message });
        throw new Error(r.error.message || 'فشل الربط');
      }
      
      const url = r.data?.url as string | undefined;
      if (!url) {
        throw new Error('لم يتم الحصول على رابط التفويض');
      }
      
      const wnd = window.open(url, '_blank', 'width=600,height=700,noopener,noreferrer');
      
      if (!wnd) {
        throw new Error('تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة للموقع.');
      }
      
      const poll = setInterval(async () => {
        if (!wnd || wnd.closed) {
          clearInterval(poll);
          await refresh();
        }
      }, 1000);
    } catch (e: any) {
      console.error('Google connect failed:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setLoading(true);
    try {
      track('gcal_sync_now_clicked');
      const r = await supabase.functions.invoke('gcal-sync', { body: {} });
      const d = r.data ?? {};
      track('gcal_sync_result', d);
      await refresh();
      return d;
    } finally {
      setLoading(false);
    }
  }

  return { status, lastSyncAt, loading, connect, syncNow, refresh };
}
