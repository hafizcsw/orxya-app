import { supabase } from '@/integrations/supabase/client'
import { useEffect, useState } from 'react'
import { identifyUser, setTelemetryOn } from './telemetry'
import { flushQueueOnce } from './sync'
import { rescheduleAllFromDB } from './notify'
import { syncPrayers, schedulePrayersFor } from '@/native/prayer'
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
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user ?? null
      setUser(u)
      setLoading(false)
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined)
      await applyProfileFlags(u?.id ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, sess) => {
      const u = sess?.user ?? null
      setUser(u)
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined)
      await applyProfileFlags(u?.id ?? null)
      // Flush queue and reschedule notifications after login
      if (u) {
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
        }, 0);
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
