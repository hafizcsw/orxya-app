import { useEffect, useRef } from 'react';

/**
 * Hook to preload lazy-loaded pages in the background
 * This improves perceived performance by loading pages before user navigates to them
 */
export function usePreloadPages() {
  const hasPreloaded = useRef(false);

  useEffect(() => {
    // Only preload once
    if (hasPreloaded.current) return;
    hasPreloaded.current = true;

    // Wait for initial page to load, then start preloading in background
    const timer = setTimeout(() => {
      // Preload most commonly used pages
      const preloadPages = async () => {
        try {
          // High priority - preload immediately
          const highPriority = [
            () => import('../pages/Today'),
            () => import('../pages/Calendar'),
          ];

          // Medium priority - preload after high priority
          const mediumPriority = [
            () => import('../pages/Projects'),
            () => import('../pages/Reports'),
            () => import('../pages/Settings'),
          ];

          // Low priority - preload when idle
          const lowPriority = [
            () => import('../pages/Profile'),
            () => import('../pages/Inbox'),
            () => import('../pages/CalendarSettings'),
          ];

          // Preload high priority first
          await Promise.all(highPriority.map(load => load()));
          console.log('[Preload] ✅ High priority pages loaded (Today, Calendar)');

          // Then medium priority with delay
          setTimeout(async () => {
            await Promise.all(mediumPriority.map(load => load()));
            console.log('[Preload] ✅ Medium priority pages loaded');
          }, 2000);

          // Finally low priority when browser is idle
          if ('requestIdleCallback' in window) {
            requestIdleCallback(async () => {
              await Promise.all(lowPriority.map(load => load()));
              console.log('[Preload] ✅ Low priority pages loaded');
            }, { timeout: 10000 });
          } else {
            setTimeout(async () => {
              await Promise.all(lowPriority.map(load => load()));
              console.log('[Preload] ✅ Low priority pages loaded');
            }, 5000);
          }
        } catch (error) {
          console.error('[Preload] Failed to preload pages:', error);
        }
      };

      preloadPages();
    }, 1000); // Wait 1 second after initial load

    return () => clearTimeout(timer);
  }, []);
}

/**
 * Preload a specific page on demand (e.g., on hover)
 */
export const preloadPage = (pageName: string) => {
  const pageMap: Record<string, () => Promise<any>> = {
    'today': () => import('../pages/Today'),
    'calendar': () => import('../pages/Calendar'),
    'calendar-full': () => import('../pages/CalendarFull'),
    'calendar-simple': () => import('../pages/CalendarSimple'),
    'calendar-settings': () => import('../pages/CalendarSettings'),
    'projects': () => import('../pages/Projects'),
    'reports': () => import('../pages/Reports'),
    'automation': () => import('../pages/Automation'),
    'ai': () => import('../pages/AI'),
    'assistant': () => import('../pages/Assistant'),
    'profile': () => import('../pages/Profile'),
    'expenses': () => import('../pages/Expenses'),
    'inbox': () => import('../pages/Inbox'),
    'settings': () => import('../pages/Settings'),
    'settings-external': () => import('../pages/SettingsExternal'),
    'settings-notifications': () => import('../pages/SettingsNotifications'),
    'settings-prayer': () => import('../pages/SettingsPrayer'),
    'settings-glances': () => import('../pages/GlancesSettings'),
    'planner': () => import('../pages/PlannerChat'),
    'conflicts': () => import('../pages/Conflicts'),
    'privacy': () => import('../pages/PrivacyCenter'),
  };

  const loader = pageMap[pageName];
  if (loader) {
    loader().then(() => {
      console.log(`[Preload] ✅ ${pageName} loaded on demand`);
    }).catch((error) => {
      console.error(`[Preload] ❌ Failed to load ${pageName}:`, error);
    });
  }
};
