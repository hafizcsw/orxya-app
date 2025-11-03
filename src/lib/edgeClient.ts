/**
 * Edge Client for TodayWHOOP v2.1
 * Handles all communication with Supabase Edge Functions
 * with telemetry, retry logic, rate limiting, and proper error handling
 */

export type EdgeFn = "conflict-check" | "ai-orchestrator" | "location-update";

const BASE = import.meta.env.VITE_SUPABASE_URL;
if (!BASE) throw new Error("Missing VITE_SUPABASE_URL");

type CallOpts = {
  jwt: string;
  signal?: AbortSignal;
  // flags
  telemetry?: boolean;
  guardrails?: boolean;
};

type EdgeErr = { status: number; message: string };

// -----------------------------
// Rate Limiting (simple in-memory bucket)
// -----------------------------
const bucket = new Map<string, { count: number; resetAt: number }>();

function allowCall(key: string, max = 6, windowMs = 10_000) {
  const now = Date.now();
  const entry = bucket.get(key) ?? { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  if (entry.count >= max) return false;
  entry.count++;
  bucket.set(key, entry);
  return true;
}

// -----------------------------
// Retry with Exponential Backoff
// -----------------------------
async function backoff<T>(fn: () => Promise<T>, retries = 2) {
  let attempt = 0;
  // jittered exponential backoff: 300ms, 600ms, 1200ms ..
  while (true) {
    try {
      return await fn();
    } catch (e: any) {
      attempt++;
      const status = typeof e?.status === "number" ? e.status : undefined;
      if (attempt > retries || (status && status < 500 && status !== 429)) throw e;
      const ms = Math.min(1500, 300 * Math.pow(2, attempt - 1)) + Math.random() * 120;
      await new Promise((r) => setTimeout(r, ms));
    }
  }
}

// -----------------------------
// Generic Edge Function Caller
// -----------------------------
export async function edgeCall<TReq, TRes>(
  fn: EdgeFn,
  body: TReq,
  opts: CallOpts
): Promise<TRes> {
  const url = `${BASE}/functions/v1/${fn}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${opts.jwt}`,
    "Content-Type": "application/json",
  };

  const key = `edge:${fn}`;
  if (opts.guardrails && !allowCall(key)) {
    const err: EdgeErr = { status: 429, message: "rate_limited" };
    (err as any).status = 429;
    throw err;
  }

  const start = performance.now();
  const exec = async () => {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    const ok = res.ok;
    const status = res.status;
    const durationMs = performance.now() - start;
    
    if (opts.telemetry) {
      logEdgeTelemetry({ fn, ok, status, durationMs });
    }

    if (!ok) {
      const text = await res.text().catch(() => "");
      const err: EdgeErr = { status, message: text || `edge_error_${status}` };
      (err as any).status = status;
      throw err;
    }
    return res.json() as Promise<TRes>;
  };

  return opts.guardrails ? backoff(exec, 2) : exec();
}

// -----------------------------
// Telemetry (simple sink)
// -----------------------------
type Telemetry = { fn: EdgeFn; ok: boolean; status: number; durationMs: number };

export function logEdgeTelemetry(t: Telemetry) {
  try {
    console.info("[edge]", t.fn, t.status, Math.round(t.durationMs) + "ms");
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("edge:telemetry", { detail: t }));
  } catch {}
}

// -----------------------------
// Type Definitions
// -----------------------------
export type ConflictReq = {
  date: string;
};

export type ConflictRes = {
  date: string;
  conflicts: Array<{
    kind: "prayer_event" | "event_event" | string;
    window: { start: string; end: string };
    event?: { id: string; title: string };
    prayer?: { name: string; time: string };
    severity: "high" | "mid" | "low";
    suggested_actions: string[];
  }>;
};

export type PlanReq = {
  intent: "plan_my_day" | "resolve_conflicts";
  preferences?: any;
  constraints?: any;
  calendar_window: {
    start: string;
    end: string;
  };
  input?: any;
};

export type PlanRes = {
  plan?: Array<{
    title: string;
    start: string;
    end: string;
    kind: string;
  }>;
  decisions?: Array<any>;
  notes?: string[];
};

export type LocUpdateReq = {
  lat: number;
  lng: number;
  accuracy?: number;
  recorded_at?: string;
};

export type LocUpdateRes = {
  ok: true;
};
