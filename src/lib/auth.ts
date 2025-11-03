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
    let tasksRun = false;
    let debounceTimer: NodeJS.Timeout | null = null;
    let isProcessing = false;
    
    console.log('[useUser] Initializing auth...')
    
    // Listen for auth changes FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || isProcessing) return;
      
      console.log('[useUser] Auth state changed:', event, session?.user ? 'User present' : 'No user')
      
      // Clear any pending debounce
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Debounce auth state changes to prevent race conditions
      debounceTimer = setTimeout(() => {
        if (!mounted) return;
        
        const u = session?.user ?? null;
        setUser(u);
        identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
        
        // Apply profile flags (non-blocking)
        applyProfileFlags(u?.id ?? null).catch(e => {
          console.error('[useUser] Profile flags error:', e);
        });
        
        // Post-login tasks (non-blocking) - only run once per session
        // Don't run if we're on the auth page
        if (u && event === 'SIGNED_IN' && !tasksRun) {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/auth')) {
            tasksRun = true;
            
            setTimeout(() => {
              console.log('[useUser] Running post-login tasks...');
              
              // Location capture + conflict check (non-blocking)
              Promise.race([
                (async () => {
                  await captureAndSendLocation();
                  await conflictCheckToday();
                })(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 15000))
              ]).catch(e => {
                console.error('Location/Conflicts failed:', e);
              });
              
              // Run other tasks without awaiting
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('Prayer timeout')), 10000))
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
        }
        
        // Reset flag when user signs out
        if (!u && event === 'SIGNED_OUT') {
          tasksRun = false;
        }
      }, 100); // 100ms debounce
    });
    
    // THEN check for existing session
    isProcessing = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      console.log('[useUser] Initial session:', u ? 'User found' : 'No user');
      setUser(u);
      setLoading(false);
      identifyUser(u?.id ?? null, u ? { email: u.email } : undefined);
      applyProfileFlags(u?.id ?? null).catch(e => {
        console.error('[useUser] Profile flags error:', e);
      });
      isProcessing = false;
    }).catch((err) => {
      console.error('[useUser] Session error:', err);
      if (mounted) {
        setUser(null);
        setLoading(false);
        isProcessing = false;
      }
    });
    
    return () => {
      mounted = false;
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading }
}
