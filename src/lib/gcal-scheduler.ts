import { supabase } from '@/integrations/supabase/client';
import { track } from '@/lib/telemetry';

export function startCalendarDailyScheduler() {
  const now = new Date();
  const next = new Date();
  next.setHours(0, 7, 0, 0); // 00:07
  
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  
  const delay = next.getTime() - now.getTime();

  const syncCalendar = async () => {
    try {
      const from = new Date(Date.now() - 7 * 864e5).toISOString();
      const to = new Date(Date.now() + 30 * 864e5).toISOString();
      
      await supabase.functions.invoke('gcal-sync', { body: { from, to } });
      track('gcal_autosync_ok');
      console.log('✅ Google Calendar auto-sync completed');
    } catch (e: any) {
      track('gcal_autosync_fail', { error: String(e?.message ?? e) });
      console.error('❌ Google Calendar auto-sync failed:', e);
    }
  };

  // جدولة أول تشغيل
  setTimeout(async () => {
    await syncCalendar();
    
    // ثم كل 24 ساعة
    setInterval(syncCalendar, 24 * 60 * 60 * 1000);
  }, delay);

  console.log(`📅 Google Calendar scheduler: first run in ${Math.round(delay / 60000)} minutes`);
}
