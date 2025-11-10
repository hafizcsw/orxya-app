// @ts-ignore - virtual module from vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register';

let notified = false;

export interface PWAUpdateCallbacks {
  onNeedRefresh?: (updateSW: () => void) => void;
  onOfflineReady?: () => void;
}

/**
 * Initialize PWA update system
 * Shows toast when update is available and allows user to update immediately
 */
export function initPWAUpdate(callbacks: PWAUpdateCallbacks) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (notified) return;
      notified = true;
      
      // Create update function that will skip waiting and reload
      const performUpdate = () => {
        updateSW(true); // skipWaiting = true
        window.location.reload();
      };
      
      callbacks.onNeedRefresh?.(performUpdate);
    },
    onOfflineReady() {
      callbacks.onOfflineReady?.();
    },
    onRegisteredSW(swUrl, registration) {
      console.log('✅ [PWA] Service Worker registered:', swUrl);
      
      // Check for updates every hour
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // 1 hour
      }
    },
  });

  return updateSW;
}

/**
 * Get current build timestamp
 */
export function getBuildVersion(): string {
  return (window as any).__APP_BUILD__ || 'development';
}

/**
 * Format build version for display
 */
export function formatBuildVersion(buildTimestamp: string): string {
  if (buildTimestamp === 'development') return 'Development';
  
  try {
    const date = new Date(buildTimestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}.${month}.${day}-${hours}${minutes}`;
  } catch {
    return buildTimestamp;
  }
}
