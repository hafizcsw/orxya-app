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
    
    // Initialize auth state using getSession (better for OAuth)
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
          flushQueueOnce();
          rescheduleAllFromDB();
          
          // تهيئة صلاة اليوم فور تسجيل الدخول
          const today = new Date().toISOString().slice(0, 10);
          try {
            await syncPrayers(today);
            await schedulePrayersFor(today);
          } catch (e) {
            console.error('Error syncing prayers on login:', e);
          }

          // موقع + مزامنة صلاة تلقائيًا إن لزم
          try {
            const { getDeviceLocation } = await import('@/native/geo');
            const { pushLocationSample } = await import('@/lib/location');
            const loc = await getDeviceLocation();
            if (loc) {
              const result = await pushLocationSample(loc.lat, loc.lon);
              if (result.did_sync) {
                console.log(`Location updated: moved ${result.moved_km}km, prayer sync triggered`);
              }
            }
          } catch (e) {
            console.error('Location push failed:', e);
          }

          // بدء مزامنة التقويم الدورية
          startCalendarAutoSync(30);
        }, 0);
      }
    });
    
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading }
}
