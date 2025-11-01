// Centralized telemetry init + helpers
// import * as Sentry from "@sentry/capacitor";
// import { ErrorBoundary } from "@sentry/react";
import { Posthog } from "@capawesome/capacitor-posthog";

const ON = String(import.meta.env.VITE_TELEMETRY_ENABLED) === "true";

export async function initTelemetry() {
  if (!ON) return;
  
  // Sentry temporarily disabled due to version conflicts
  // try {
  //   const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  //   if (dsn) {
  //     Sentry.init({
  //       dsn,
  //       integrations: [],
  //       tracesSampleRate: 0.2,
  //       replaysSessionSampleRate: 0.0,
  //       replaysOnErrorSampleRate: 1.0,
  //     });
  //     console.log('✅ Sentry initialized');
  //   }
  // } catch (e) {
  //   console.warn('⚠️ Sentry init failed:', e);
  // }
  
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
  if (!ON) return;
  try {
    if (distinctId) {
      Posthog.identify({ distinctId, ...(props || {}) });
    } else {
      Posthog.reset(); // logout
    }
  } catch {}
}

export function track(event: string, properties?: Record<string, any>) {
  if (!ON) return;
  try { 
    Posthog.capture({ event, ...(properties || {}) }); 
  } catch {}
}

// Alias for backward compatibility
export { track as trackEvent };

// Sentry Error Boundary disabled temporarily
// export { ErrorBoundary as SentryErrorBoundary };
