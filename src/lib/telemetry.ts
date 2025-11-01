// Centralized telemetry init + helpers
// import * as Sentry from "@sentry/capacitor";
// import { ErrorBoundary } from "@sentry/react";
import { Posthog } from "@capawesome/capacitor-posthog";

let RUNTIME_ON = String(import.meta.env.VITE_TELEMETRY_ENABLED) === "true";

export function setTelemetryOn(on: boolean) {
  RUNTIME_ON = !!on;
  try {
    if (!RUNTIME_ON) {
      Posthog.reset();
    }
  } catch {}
}

function ON() { 
  return RUNTIME_ON; 
}

export async function initTelemetry() {
  if (!ON()) return;
  
  // Sentry temporarily disabled due to version conflicts
  // PostHog
  try {
    const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
    const host = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";
    if (key) {
      await Posthog.setup({ apiKey: key, host });
      console.log('✅ PostHog initialized');
    }
  } catch (e) {
    console.warn('⚠️ PostHog init failed:', e);
  }
}

export function identifyUser(distinctId: string | null, props?: Record<string, any>) {
  if (!ON()) return;
  try {
    if (distinctId) {
      Posthog.identify({ distinctId, ...props });
    } else {
      Posthog.reset();
    }
  } catch {}
}

export function track(event: string, properties?: Record<string, any>) {
  if (!ON()) return;
  try { 
    Posthog.capture({ event, properties: properties ?? {} }); 
  } catch {}
}

// Alias for backward compatibility
export { track as trackEvent };

// Sentry Error Boundary disabled temporarily
// export { ErrorBoundary as SentryErrorBoundary };
