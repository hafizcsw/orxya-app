// Epic 10: Analytics Client
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventKind =
  | "widget_tap"
  | "tile_plan"
  | "tile_focus"
  | "tile_add"
  | "ai_plan"
  | "ai_resolve"
  | "ai_brief"
  | "budget_guard"
  | "money_confirm"
  | "focus_toggle"
  | "privacy_export"
  | "privacy_toggle"
  | "page_view"
  | "feature_use";

export interface AnalyticsEvent {
  kind: AnalyticsEventKind;
  meta?: Record<string, any>;
}

// Local queue for batching
const queue: AnalyticsEvent[] = [];
const BATCH_SIZE = 10;
const BATCH_TIMEOUT = 5000; // 5 seconds
let batchTimer: NodeJS.Timeout | null = null;

async function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, queue.length);
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // Don't track if not authenticated

    await supabase.functions.invoke("analytics-batch", {
      body: batch,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
  } catch (error) {
    console.error("Analytics flush failed:", error);
  }
}

export function trackEvent(kind: AnalyticsEventKind, meta?: Record<string, any>) {
  queue.push({ kind, meta });

  // Auto-flush on batch size
  if (queue.length >= BATCH_SIZE) {
    if (batchTimer) clearTimeout(batchTimer);
    flush();
    return;
  }

  // Set timeout for next flush
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flush, BATCH_TIMEOUT);
}

// Track page views automatically
export function trackPageView(path: string) {
  trackEvent("page_view", { path });
}

// Export for manual flush on unmount
export { flush as flushAnalytics };
