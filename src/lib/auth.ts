import { supabase } from '@/integrations/supabase/client'
import { useEffect, useState } from 'react'
import { identifyUser, setTelemetryOn } from './telemetry'
import { flushQueueOnce } from './sync'
import { rescheduleAllFromDB } from './notify'
import { syncPrayers, schedulePrayersFor } from '@/native/prayer'
import { startCalendarAutoSync } from '@/native/calendar'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  async function applyProfileFlags(uid: string | null) {
    if (!uid) { 
      setTelemetryOn(false); 
      return; 
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('telemetry_enabled')
        .eq('id', uid)
        .maybeSingle();
      setTelemetryOn(data?.telemetry_enabled ?? false);
    } catch (e) {
      console.error('Error loading profile flags:', e);
    }
  }

  useEffect(() => {
    let mounted = true;
    
    console.log('[useUser] Initializing auth...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      console.log('[useUser] Initial session:', u ? 'User found' : 'No user');
      setUser(u);
      setLoading(false);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      applyProfileFlags(u?.id ?? null);
    }).catch((err) => {
      console.error('[useUser] Session error:', err);
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('[useUser] Auth state changed:', event, session?.user ? 'User present' : 'No user')
      
      const u = session?.user ?? null;
      setUser(u);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      await applyProfileFlags(u?.id ?? null);
      
      // Post-login tasks (non-blocking)
      if (u && event === 'SIGNED_IN') {
        setTimeout(() => {
          console.log('[useUser] Running post-login tasks...');
          
          // Run without awaiting
          Promise.all([
            flushQueueOnce().catch(e => console.error('Flush failed:', e)),
            rescheduleAllFromDB().catch(e => console.error('Reschedule failed:', e))
          ]);
          
          // Prayer sync (with timeout)
          const today = new Date().toISOString().slice(0, 10);
          Promise.race([
            (async () => {
              await syncPrayers(today);
              await schedulePrayersFor(today);
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Prayer timeout')), 3000))
          ]).then(() => {
            console.log('[useUser] Prayer sync done');
          }).catch(e => {
            console.error('Prayer sync failed:', e);
          });

          // Calendar sync (with timeout)
          Promise.race([
            startCalendarAutoSync(30),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Calendar timeout')), 2000))
          ]).catch(e => {
            console.error('Calendar sync failed:', e);
          });
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
