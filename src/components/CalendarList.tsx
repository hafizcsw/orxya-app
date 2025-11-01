import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type EventRow = {
  id: string;
  title: string | null;
  starts_at: string;
  ends_at: string;
  source_id: string | null;
  external_source: string | null;
};

export default function CalendarList() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const today = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 864e5).toISOString();
      const { data } = await supabase
        .from('events')
        .select('id,title,starts_at,ends_at,source_id,external_source')
        .gte('starts_at', today)
        .lte('starts_at', to)
        .order('starts_at', { ascending: true })
        .limit(100);
      setRows((data ?? []) as EventRow[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="rounded-xl border divide-y">
      {rows.length === 0 && <div className="p-4 text-sm text-muted-foreground">لا أحداث خلال 7 أيام.</div>}
      {rows.map(ev => (
        <div key={ev.id} className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ev.external_source === 'google' ? <span title="Google">ⓖ</span> : <span>•</span>}
            <div>
              <div className="font-medium">{ev.title || '(بدون عنوان)'}</div>
              <div className="text-xs text-muted-foreground">
                {new Date(ev.starts_at).toLocaleString()} → {new Date(ev.ends_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <div className="text-xs uppercase text-muted-foreground">{ev.external_source || ev.source_id || 'local'}</div>
        </div>
      ))}
    </div>
  );
}
