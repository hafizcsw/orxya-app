/**
 * Edge Client for TodayWHOOP v2.1
 * Handles all communication with Supabase Edge Functions
 * with telemetry, retry logic, and proper error handling
 */

export type EdgeCall = "conflict-check" | "ai-orchestrator" | "location-update";

const BASE = import.meta.env.VITE_SUPABASE_URL;

/**
 * Generic edge function caller with telemetry and error handling
 */
export async function edgeCall<TReq, TRes>(
  fn: EdgeCall,
  jwt: string,
  body: TReq,
  signal?: AbortSignal
): Promise<TRes> {
  const url = `${BASE}/functions/v1/${fn}`;
  const startTime = performance.now();
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });

    const duration = performance.now() - startTime;
    
    // Log telemetry
    console.log(`[Edge] ${fn}`, {
      status: res.status,
      duration: `${duration.toFixed(2)}ms`,
      size: res.headers.get('content-length'),
    });

    if (!res.ok) {
      throw new Error(`${fn} failed with status ${res.status}`);
    }

    return res.json() as Promise<TRes>;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[Edge] ${fn} error`, {
      error,
      duration: `${duration.toFixed(2)}ms`,
    });
    throw error;
  }
}

// -----------------------------
// Type Definitions
// -----------------------------

export type ConflictReq = {
  date: string;
};

export type ConflictRes = {
  conflicts: Array<{
    kind: string;
    window: { start: string; end: string };
    event?: { id: string; title: string };
    prayer?: { name: string; time: string };
    severity: "high" | "mid" | "low";
    suggested_actions: string[];
  }>;
};

export type PlanReq = {
  intent: "plan_my_day";
  preferences?: any;
  constraints?: any;
  calendar_window: {
    start: string;
    end: string;
  };
};

export type PlanRes = {
  plan: Array<{
    title: string;
    start: string;
    end: string;
    kind: string;
  }>;
  decisions?: any[];
  notes?: string[];
};

export type LocationReq = {
  latitude: number;
  longitude: number;
  accuracy_m: number;
  sampled_at: string;
  provider: string;
};

export type LocationRes = {
  success: boolean;
  message: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
};
