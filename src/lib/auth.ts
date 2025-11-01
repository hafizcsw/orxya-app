import { supabase } from '@/integrations/supabase/client'
import { useEffect, useState } from 'react'
import { identifyUser } from './telemetry'
import { flushQueueOnce } from './sync'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null)
      setLoading(false)
      identifyUser(data.user?.id ?? null, data.user ? { email: data.user.email } : undefined)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      const u = sess?.user ?? null
      setUser(u)
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined)
      // Flush queue after login
      if (u) {
        setTimeout(() => {
          flushQueueOnce();
        }, 0);
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
