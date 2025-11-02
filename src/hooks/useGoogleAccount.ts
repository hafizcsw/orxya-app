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
    if (!uid) {
      setStatus('disconnected');
      return;
    }

    const { data } = await supabase
      .from('external_accounts')
      .select('status,last_sync_at')
      .eq('owner_id', uid)
      .eq('provider', 'google')
      .maybeSingle();

    setStatus((data?.status as ExternalStatus) ?? 'disconnected');
    setLastSyncAt(data?.last_sync_at ?? null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function connect() {
    setLoading(true);
    try {
      track('gcal_connect_clicked');
      const { data, error } = await supabase.functions.invoke('oauth-gcal-start', {
        body: {},
      });

      if (error) throw error;

      const url = data?.url as string | undefined;
      const state = data?.state as string | undefined;
      
      if (url && state) {
        localStorage.setItem('g_oauth_state', state);
        window.location.href = url;
      }
    } catch (e: any) {
      console.error('Google connect error:', e);
      track('gcal_connect_error', { error: e?.message });
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setLoading(true);
    try {
      track('gcal_sync_now_clicked');
      const { data, error } = await supabase.functions.invoke('gcal-sync', {
        body: {},
      });

      if (error) throw error;

      track('gcal_sync_result', data ?? {});
      await refresh();
      return data;
    } catch (e: any) {
      console.error('Google sync error:', e);
      track('gcal_sync_error', { error: e?.message });
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { status, lastSyncAt, loading, connect, syncNow, refresh };
}
