import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';
import { useUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type ExtAcc = {
  provider: 'google';
  account_email: string | null;
  status: string | null;
  expires_at: string | null;
  primary_calendar_id: string | null;
  last_sync_at: string | null;
};

export default function SettingsExternal() {
  const { user } = useUser();
  const [acc, setAcc] = useState<ExtAcc | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!user) { setAcc(null); return; }
    const { data } = await supabase
      .from('external_accounts')
      .select('provider,account_email,status,expires_at,primary_calendar_id,last_sync_at')
      .eq('owner_id', user.id)
      .eq('provider', 'google')
      .maybeSingle();
    setAcc((data as any) ?? null);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function linkGoogle() {
    setMsg(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('oauth-gcal-start', {});
      if (error || !data?.url) { 
        setMsg('تعذّر بدء الربط'); 
        return; 
      }
      localStorage.setItem('g_oauth_state', data.state);
      track('oauth_google_start');
      window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  async function unlinkGoogle() {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from('external_accounts')
        .update({ status: 'disconnected', access_token_enc: null })
        .eq('owner_id', user.id)
        .eq('provider', 'google');
      track('oauth_google_unlink');
      await load();
      setMsg('تم إلغاء الربط');
    } finally {
      setLoading(false);
    }
  }

  async function syncNow() {
    setLoading(true);
    setMsg(null);
    try {
      const from = new Date(Date.now() - 14 * 864e5).toISOString();
      const to = new Date(Date.now() + 90 * 864e5).toISOString();
      const { data, error } = await supabase.functions.invoke('gcal-sync', { 
        body: { from, to } 
      });
      if (error) { 
        setMsg('فشلت المزامنة'); 
        return; 
      }
      track('oauth_google_sync_now', { imported: data?.imported ?? 0 });
      setMsg(`تم الاستيراد: ${data?.imported ?? 0} حدث`);
      await load();
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center text-muted-foreground">
          سجّل الدخول لعرض التكاملات الخارجية.
        </div>
      </div>
    );
  }

  const isConnected = acc?.status === 'connected';

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold">التكاملات الخارجية</h1>

      <div className="rounded-2xl border border-border p-6 bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              <div className="font-semibold text-lg">Google Calendar</div>
            </div>
            <div className="text-sm text-muted-foreground">
              مزامنة تقويمك مع Google Calendar (قراءة فقط حالياً)
            </div>
          </div>
          <div>
            {!isConnected ? (
              <Button 
                onClick={linkGoogle} 
                disabled={loading}
                className="px-4 py-2"
              >
                {loading ? '...' : 'ربط الحساب'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={syncNow} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? '⏳' : '🔄'} {loading ? 'جارٍ المزامنة...' : 'مزامنة الآن'}
                </Button>
                <Button 
                  onClick={unlinkGoogle} 
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  إلغاء الربط
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 text-sm pt-4 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-medium">الحالة:</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}>
                {isConnected ? '✅ متصل' : '❌ غير متصل'}
              </span>
            </div>
            <div>
              <span className="font-medium">البريد الإلكتروني: </span>
              <span className="text-muted-foreground">{acc?.account_email ?? '—'}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="font-medium">التقويم الأساسي: </span>
              <span className="text-muted-foreground">{acc?.primary_calendar_id ?? 'primary'}</span>
            </div>
            <div>
              <span className="font-medium">آخر مزامنة: </span>
              <span className="text-muted-foreground">
                {acc?.last_sync_at 
                  ? new Date(acc.last_sync_at).toLocaleString('ar-AE', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })
                  : '—'
                }
              </span>
            </div>
          </div>
        </div>

        {msg && (
          <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
            {msg}
          </div>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>
            💡 <strong>ملاحظة:</strong> المزامنة الحالية للقراءة فقط. 
            سيتم إضافة الكتابة الثنائية (إنشاء/تعديل أحداث في Google) في التحديثات القادمة.
          </p>
        </div>
      </div>
    </div>
  );
}
