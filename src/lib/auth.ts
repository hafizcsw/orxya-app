import { supabase } from '@/integrations/supabase/client'
import { useEffect, useState } from 'react'
import { identifyUser, setTelemetryOn } from './telemetry'
import { flushQueueOnce } from './sync'
import { rescheduleAllFromDB } from './notify'
import { syncPrayers, schedulePrayersFor } from '@/native/prayer'
import { startCalendarAutoSync } from '@/native/calendar'
import { captureAndSendLocation } from '@/native/location'
import { conflictCheckToday } from './conflicts'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
    }).catch((err) => {
      console.error('[useUser] Session error:', err);
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      
      console.log('[useUser] Auth state changed:', event, u ? 'User present' : 'No user');
      
      // Post-login tasks (non-blocking) - only on SIGNED_IN
      if (u && event === 'SIGNED_IN') {
        setTimeout(() => {
          Promise.all([
            flushQueueOnce().catch(e => console.error('Flush failed:', e)),
            rescheduleAllFromDB().catch(e => console.error('Reschedule failed:', e)),
            captureAndSendLocation().then(() => conflictCheckToday()).catch(e => console.error('Location/Conflicts failed:', e)),
          ]);
          
          // Prayer sync
          const today = new Date().toISOString().slice(0, 10);
          syncPrayers(today).then(() => schedulePrayersFor(today)).catch(e => console.error('Prayer sync failed:', e));
          
          // Calendar sync - returns Promise
          Promise.resolve(startCalendarAutoSync(30)).catch(e => console.error('Calendar sync failed:', e));
        }, 100);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading }
}
