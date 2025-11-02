import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/telemetry";

/**
 * Captures device location and sends it to the backend
 * Works on both native (Capacitor) and web (browser geolocation)
 */
export async function captureAndSendLocation(): Promise<boolean> {
  try {
    // Try Capacitor Geolocation first (native platforms)
    const Cap = (window as any).Capacitor;
    if (Cap?.isNativePlatform?.()) {
      const { Geolocation } = await import('@capacitor/geolocation');
      const { coords, timestamp } = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000
      });
      
      const { data, error } = await supabase.functions.invoke('location-update', {
        body: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy_m: coords.accuracy ?? null,
          sampled_at: new Date(timestamp).toISOString(),
          provider: 'device'
        }
      });

      if (error) throw error;
      
      track('location_captured', {
        provider: 'capacitor',
        saved: data?.saved ?? false,
        accuracy: coords.accuracy
      });
      
      return true;
    }

    // Fallback to browser geolocation
    if ("geolocation" in navigator) {
      const success = await new Promise<boolean>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              const { data, error } = await supabase.functions.invoke('location-update', {
                body: {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy_m: pos.coords.accuracy ?? null,
                  sampled_at: new Date().toISOString(),
                  provider: 'browser'
                }
              });

              if (error) throw error;
              
              track('location_captured', {
                provider: 'browser',
                saved: data?.saved ?? false,
                accuracy: pos.coords.accuracy
              });
              
              resolve(true);
            } catch (e) {
              console.error('Failed to send location:', e);
              resolve(false);
            }
          },
          (err) => {
            console.warn('Geolocation error:', err);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
      
      return success;
    }
  } catch (err) {
    console.error('Error capturing location:', err);
    track('location_capture_error', { error: String(err) });
  }
  
  return false;
}

/**
 * Starts periodic location tracking (native platforms only)
 * @param intervalMinutes - How often to capture location (default: 15 minutes)
 */
export function startLocationTracking(intervalMinutes: number = 15): () => void {
  const Cap = (window as any).Capacitor;
  if (!Cap?.isNativePlatform?.()) {
    console.log('[Location] Skipping periodic tracking on web');
    return () => {};
  }

  console.log(`[Location] Starting periodic tracking every ${intervalMinutes} minutes`);
  
  // Periodic capture (no initial capture - will be triggered by auth.ts after login)
  const interval = setInterval(async () => {
    // Check if user is authenticated before capturing
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await captureAndSendLocation();
    }
  }, intervalMinutes * 60 * 1000);

  // Return cleanup function
  return () => {
    clearInterval(interval);
    console.log('[Location] Stopped periodic tracking');
  };
}
