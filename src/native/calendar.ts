import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';

let timer: any = null;
let running = false;

export function startCalendarAutoSync(intervalMin = 30) {
  if (timer) clearInterval(timer);

  async function tick() {
    if (running) return;
    running = true;
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id;
      if (!uid) return;

      const { data } = await supabase
        .from('external_accounts')
        .select('status')
        .eq('owner_id', uid)
        .eq('provider', 'google')
        .maybeSingle();

      if (data?.status === 'connected') {
        track('gcal_autosync_tick');
        await supabase.functions.invoke('gcal-sync', { body: {} });
      }
    } catch { /* silent */ }
    finally { running = false; }
  }

  setTimeout(tick, 10_000);
  timer = setInterval(tick, Math.max(5, intervalMin) * 60 * 1000);
}
