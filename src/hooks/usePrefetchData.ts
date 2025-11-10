import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to prefetch API data in the background for better UX
 * Prefetches data for Today and Calendar pages
 */
export function usePrefetchData(user: User | null) {
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Only prefetch if user is logged in and haven't prefetched yet
    if (!user || hasPrefetched.current) return;
    hasPrefetched.current = true;

    // Wait a bit before starting prefetch to not impact initial load
    const timer = setTimeout(() => {
      prefetchTodayData();
      prefetchCalendarData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);
}

/**
 * Prefetch data for Today page
 */
async function prefetchTodayData() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    console.log('[Prefetch] 📊 Starting Today page data prefetch...');

    // Prefetch in parallel for speed
    await Promise.allSettled([
      // Today activities
      supabase
        .from('vw_today_activities')
        .select('*')
        .eq('day', today)
        .maybeSingle(),
      
      // Health samples for today
      supabase
        .from('health_samples')
        .select('*')
        .gte('day', today)
        .lte('day', today)
        .order('day', { ascending: false }),
      
      // User goals
      supabase
        .from('user_goals')
        .select('*')
        .eq('is_active', true),
      
      // Focus state
      supabase
        .from('user_focus_state')
        .select('active')
        .maybeSingle(),
      
      // Yesterday's activities for comparison
      supabase
        .from('vw_today_activities')
        .select('*')
        .eq('day', yesterday)
        .maybeSingle(),
    ]);

    console.log('[Prefetch] ✅ Today page data prefetched');
  } catch (error) {
    console.error('[Prefetch] ❌ Failed to prefetch Today data:', error);
  }
}

/**
 * Prefetch data for Calendar page
 */
async function prefetchCalendarData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    console.log('[Prefetch] 📅 Starting Calendar page data prefetch...');

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startISO = weekStart.toISOString().split('T')[0];
    const endISO = weekEnd.toISOString().split('T')[0];

    // Prefetch in parallel - only user profile for now
    // Calendar events will be loaded by the Calendar component itself
    await Promise.allSettled([
      // User profile for calendar settings
      supabase
        .from('profiles')
        .select('show_prayer_times_on_calendar, show_declined_events, show_weekends, working_hours_start, working_hours_end, working_days')
        .eq('id', user.id)
        .maybeSingle(),
      
      // Today's activities for calendar reference
      supabase
        .from('vw_today_activities')
        .select('*')
        .eq('day', today.toISOString().split('T')[0])
        .maybeSingle(),
    ]);

    console.log('[Prefetch] ✅ Calendar page data prefetched');
  } catch (error) {
    console.error('[Prefetch] ❌ Failed to prefetch Calendar data:', error);
  }
}

/**
 * Prefetch specific page data on demand
 */
export const prefetchPageData = async (pageName: 'today' | 'calendar') => {
  if (pageName === 'today') {
    await prefetchTodayData();
  } else if (pageName === 'calendar') {
    await prefetchCalendarData();
  }
};
