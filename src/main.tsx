import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
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

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available, reload
                console.log('🔄 New version available, updating...');
                window.location.reload();
              }
            });
          }
        });
      })
      .catch(err => console.error('❌ Service Worker registration failed:', err));
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
