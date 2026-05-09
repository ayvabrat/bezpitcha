// Production-grade REST client for the Python backend.
// - Timeout per request (configurable)
// - Retry with exponential backoff for network errors and 5xx
// - AbortController support
// - Health telemetry (success/failure/latency) via emitter for HealthBadge
// - No JWT — backend is single-user trusted mode

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://api.bezpitcha.ru";

export class ApiError extends Error {
  constructor(public status: number, message: string, public retried = 0) {
    super(message);
  }
}

// --- Health telemetry --------------------------------------------------------

export type HealthStatus = "unknown" | "online" | "degraded" | "offline";

export interface HealthSnapshot {
  status: HealthStatus;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastError: string | null;
  latencyMs: number | null;
  consecutiveFailures: number;
}

let snapshot: HealthSnapshot = {
  status: "unknown",
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
  latencyMs: null,
  consecutiveFailures: 0,
};
const listeners = new Set<(s: HealthSnapshot) => void>();
function emit() { listeners.forEach((l) => l(snapshot)); }

export function getHealth(): HealthSnapshot { return snapshot; }
export function subscribeHealth(cb: (s: HealthSnapshot) => void): () => void {
  listeners.add(cb);
  cb(snapshot);
  return () => { listeners.delete(cb); };
}
export function markDegraded(reason: string | null) {
  snapshot = { ...snapshot, status: "degraded", lastError: reason };
  emit();
}

function recordSuccess(latencyMs: number) {
  snapshot = {
    ...snapshot,
    status: snapshot.status === "degraded" ? "degraded" : "online",
    lastSuccessAt: Date.now(),
    latencyMs,
    consecutiveFailures: 0,
  };
  emit();
}
function recordFailure(message: string) {
  const fails = snapshot.consecutiveFailures + 1;
  snapshot = {
    ...snapshot,
    status: fails >= 2 ? "offline" : "degraded",
    lastErrorAt: Date.now(),
    lastError: message,
    consecutiveFailures: fails,
  };
  emit();
}

// --- request -----------------------------------------------------------------

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryOn5xx?: boolean;
  silent?: boolean; // don't update health badge (e.g. health probe avoids loops)
}

const DEFAULT_TIMEOUT = 20_000;

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function requestOnce<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers = new Headers(opts.headers);
  if (!headers.has("Content-Type") && opts.body && !(opts.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const ctrl = new AbortController();
  const userSignal = opts.signal as AbortSignal | undefined;
  if (userSignal) {
    if (userSignal.aborted) ctrl.abort(userSignal.reason);
    else userSignal.addEventListener("abort", () => ctrl.abort(userSignal.reason), { once: true });
  }
  const timeoutId = setTimeout(() => ctrl.abort(new DOMException("timeout", "TimeoutError")), opts.timeoutMs ?? DEFAULT_TIMEOUT);
  const t0 = performance.now();

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers, signal: ctrl.signal });
    const latency = Math.round(performance.now() - t0);

    if (!res.ok) {
      let msg = `${res.status} ${res.statusText}`;
      try { const j = await res.json(); msg = j.message || j.error || msg; } catch { /* */ }
      const err = new ApiError(res.status, msg);
      if (!opts.silent) recordFailure(msg);
      throw err;
    }

    if (!opts.silent) recordSuccess(latency);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    const err = e as Error;
    const msg = err.name === "AbortError" || err.name === "TimeoutError"
      ? "Тайм-аут запроса"
      : `Сеть недоступна: ${err.message}`;
    if (!opts.silent) recordFailure(msg);
    throw new ApiError(0, msg);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const maxRetries = opts.retries ?? 2;
  let lastErr: ApiError | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestOnce<T>(path, opts);
    } catch (e) {
      const err = e as ApiError;
      lastErr = err;
      // Don't retry on aborts from caller
      if ((opts.signal as AbortSignal | undefined)?.aborted) throw err;
      // Don't retry 4xx (except 408/429)
      const retriable = err.status === 0 || err.status === 408 || err.status === 429 || err.status >= 500;
      if (!retriable || attempt === maxRetries) {
        if (lastErr) lastErr.retried = attempt;
        throw err;
      }
      const delay = Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 200);
      await sleep(delay);
    }
  }
  throw lastErr!;
}

// --- Types -------------------------------------------------------------------

export interface Stats {
  parsed_total: number;
  queue_count: number;
  published_today: number;
  published_week: number;
  rejected_total: number;
  degraded?: boolean;
  degraded_reason?: string;
}

export interface Material {
  id: string;
  source_name: string;
  source_type: string;
  original_text: string;
  media_paths: string[];
  relevance_score: number;
  interest_score: number;
  actuality_score: number;
  content_type: string;
  platforms: string[];
  recommendation: "publish" | "maybe" | "skip";
  reasoning: string;
  parsed_at: string;
}

export interface MaterialList {
  items: Material[];
  total: number;
}

export interface GenerateResponse {
  content: string;
  title: string;
  platform: string;
}

export interface WatermarkSettings {
  image_url?: string | null;
  opacity?: number;
}

// --- Endpoints ---------------------------------------------------------------

export const apiClient = {
  stats: (signal?: AbortSignal) =>
    request<Stats>("/api/stats", { signal, timeoutMs: 8000 }),

  // Lightweight health probe — silent, won't flap the badge with its own success/fail
  ping: async (signal?: AbortSignal): Promise<{ ok: boolean; latencyMs: number; degraded: boolean; reason?: string }> => {
    const t0 = performance.now();
    try {
      const s = await request<Stats>("/api/stats", { signal, timeoutMs: 6000, retries: 0, silent: true });
      const latencyMs = Math.round(performance.now() - t0);
      return { ok: true, latencyMs, degraded: !!s.degraded, reason: s.degraded_reason };
    } catch (e) {
      return { ok: false, latencyMs: Math.round(performance.now() - t0), degraded: false, reason: (e as Error).message };
    }
  },

  materials: (params: {
    page: number;
    limit: number;
    recommendation?: string;
    source?: string;
    q?: string;
  }, signal?: AbortSignal) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("limit", String(params.limit));
    if (params.recommendation) qs.set("recommendation", params.recommendation);
    if (params.source) qs.set("source", params.source);
    if (params.q) qs.set("q", params.q);
    return request<MaterialList>(`/api/materials?${qs}`, { signal, timeoutMs: 15_000 });
  },

  analyze: (id: string, signal?: AbortSignal) =>
    request<{ material: Material }>(`/api/materials/${id}/analyze`, {
      method: "POST", signal, timeoutMs: 60_000, retries: 0,
    }),

  generate: (id: string, platform: string, signal?: AbortSignal) =>
    request<GenerateResponse>(`/api/materials/${id}/generate`, {
      method: "POST", body: JSON.stringify({ platform }), signal, timeoutMs: 60_000, retries: 0,
    }),

  topics: (signal?: AbortSignal) =>
    request<{ topics: string[] }>("/api/topics", { method: "POST", signal, timeoutMs: 30_000, retries: 0 }),

  scanChannel: (username: string, signal?: AbortSignal) =>
    request<{ success: boolean; message: string }>("/api/channels/scan", {
      method: "POST", body: JSON.stringify({ username }), signal, timeoutMs: 60_000, retries: 0,
    }),

  watermark: (signal?: AbortSignal) =>
    request<WatermarkSettings>("/api/watermark", { signal, timeoutMs: 8000 }),
};
