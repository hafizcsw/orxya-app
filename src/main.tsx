import { StrictMode } from "react";
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
import { Toaster } from "@/components/ui/sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

initOnlineSync();
void initTelemetry();
startDailyRescheduler();
startPrayerDailyScheduler();
startCalendarAutoSync(60);
startCalendarDailyScheduler();
startLocationTracking(15); // Capture location every 15 minutes on native

// Bootstrap: location + conflicts on visibility change (for web only, when user is logged in)
(function bootstrapEnvAwarePingers() {
  // On web: refresh on visibility change (only if user is authenticated)
  const Cap = (window as any).Capacitor;
  if (!Cap?.isNativePlatform?.()) {
    document.addEventListener("visibilitychange", async () => {
      if (document.visibilityState === "visible") {
        // Add delay to ensure auth is ready
        setTimeout(async () => {
          try {
            // Check if user is authenticated before calling
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session?.user) {
              await captureAndSendLocation();
              await conflictCheckToday();
            }
          } catch (e) {
            console.error('[Visibility] Location/Conflicts failed:', e);
          }
        }, 500);
      }
    });
  }
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster />
    </ErrorBoundary>
  </StrictMode>
);
