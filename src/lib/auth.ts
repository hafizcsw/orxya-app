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
    const { data } = await supabase
      .from('profiles')
      .select('telemetry_enabled')
      .eq('id', uid)
      .maybeSingle();
    setTelemetryOn(data?.telemetry_enabled ?? false);
  }

  useEffect(() => {
    let mounted = true;
    
    console.log('[useUser] Initializing auth...')
    
    // Initialize auth state using getSession
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      
      if (error) {
        console.error('[useUser] Session error:', error);
      }
      
      const u = session?.user ?? null;
      console.log('[useUser] Initial session:', u ? 'User found' : 'No user')
      setUser(u);
      setLoading(false);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      await applyProfileFlags(u?.id ?? null);
    }).catch((err) => {
      console.error('[useUser] Auth initialization error:', err);
      if (mounted) {
        setUser(null);
        setLoading(false);
      }
    });
    
    // Listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (!mounted) return;
      
      console.log('[useUser] Auth state changed:', event, sess?.user ? 'User present' : 'No user')
      
      const u = sess?.user ?? null;
      setUser(u);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      await applyProfileFlags(u?.id ?? null);
      
      // Flush queue and reschedule notifications after login
      if (u && event === 'SIGNED_IN') {
        setTimeout(async () => {
          try {
            console.log('[useUser] Starting post-login tasks...');
            
            // Run these without blocking
            Promise.all([
              flushQueueOnce().catch(e => console.error('Flush failed:', e)),
              rescheduleAllFromDB().catch(e => console.error('Reschedule failed:', e))
            ]);
            
            // تهيئة صلاة اليوم فور تسجيل الدخول (مع timeout)
            const today = new Date().toISOString().slice(0, 10);
            Promise.race([
              (async () => {
                await syncPrayers(today);
                await schedulePrayersFor(today);
              })(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Prayer sync timeout')), 3000))
            ]).then(() => {
              console.log('[useUser] Prayer sync completed');
            }).catch(e => {
              console.error('Error syncing prayers on login:', e);
            });

            // بدء مزامنة التقويم الدورية (مع timeout)
            Promise.race([
              startCalendarAutoSync(30),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Calendar sync timeout')), 2000))
            ]).then(() => {
              console.log('[useUser] Calendar auto-sync started');
            }).catch(e => {
              console.error('Calendar sync failed:', e);
            });
            
            console.log('[useUser] Post-login tasks initiated');
          } catch (err) {
            console.error('[useUser] Post-login error:', err);
          }
        }, 100);
      }
    });
    
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading }
}
