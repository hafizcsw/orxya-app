import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { DeviceTypeProvider } from "./contexts/DeviceContext";
import { initOnlineSync } from "./lib/sync";
import { initTelemetry } from "./lib/telemetry";
import { startDailyRescheduler } from "./lib/notify";
import { startPrayerDailyScheduler } from "./native/prayer";
import { startCalendarAutoSync } from "./native/calendar";
import { startCalendarDailyScheduler } from "./lib/gcal-scheduler";
import { startLocationTracking, captureAndSendLocation } from "./native/location";
import { conflictCheckToday } from "./lib/conflicts";
import { supabase } from "@/integrations/supabase/client";
import { ErrorBoundary } from "@/components/ErrorBoundary";

initOnlineSync();
void initTelemetry();
startDailyRescheduler();
startPrayerDailyScheduler();
startCalendarAutoSync(60);
startCalendarDailyScheduler();
startLocationTracking(15); // Capture location every 15 minutes on native

// Bootstrap: location + conflicts on visibility change (for web only, when user is logged in)
// Can be enabled/disabled from Automation settings
(function bootstrapEnvAwarePingers() {
  const Cap = (window as any).Capacitor;
  if (!Cap?.isNativePlatform?.()) {
    let debounceTimer: NodeJS.Timeout | null = null;
    
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        // Debounce visibility changes
        if (debounceTimer) clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(async () => {
          // Check if auto-check is enabled (enabled by default)
          const autoCheck = localStorage.getItem("conflict_auto_check");
          if (autoCheck === "disabled") return;
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Run location and conflicts sequentially, not in parallel
              await captureAndSendLocation().catch(e => 
                console.warn('[Visibility] Location failed:', e)
              );
              await conflictCheckToday().catch(e => 
                console.warn('[Visibility] Conflicts failed:', e)
              );
            }
          } catch (e) {
            console.error('[Visibility] Bootstrap failed:', e);
          }
        }, 2000); // Increased debounce to 2 seconds
      }
    });
  }
})();

// PWA Installation - VitePWA handles service worker automatically
if ('serviceWorker' in navigator) {
  // Listen for installation prompt
  window.addEventListener('beforeinstallprompt', (e: any) => {
    console.log('🎯 [PWA] Install prompt detected - app is installable!');
    e.preventDefault();
    // Store for usePWAInstall hook to access
    (window as any).deferredPrompt = e;
    // Dispatch custom event for React to catch
    window.dispatchEvent(new Event('pwa-installable'));
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ [PWA] App installed successfully');
    (window as any).deferredPrompt = null;
    window.dispatchEvent(new Event('pwa-installed'));
  });

  // Log service worker status for debugging
  navigator.serviceWorker.ready.then(registration => {
    console.log('✅ [PWA] Service Worker ready:', registration.scope);
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <DeviceTypeProvider>
      <App />
    </DeviceTypeProvider>
  </ErrorBoundary>
);
