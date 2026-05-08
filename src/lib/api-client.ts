// REST client for the Python backend.
// Base URL is read from VITE_API_BASE_URL (defaults to http://localhost:8000).
import { getAccessToken } from "./supabase-auth";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://144.31.53.245:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch (e) {
    throw new ApiError(0, `Сеть недоступна: ${(e as Error).message}`);
  }
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j.message || j.error || msg;
    } catch { /* ignore */ }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ----- Types -----
export interface Stats {
  parsed_total: number;
  queue_count: number;
  published_today: number;
  published_week: number;
  rejected_total: number;
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

// ----- Endpoints (Python) -----
export const apiClient = {
  stats: () => request<Stats>("/api/stats"),
  materials: (params: {
    page: number;
    limit: number;
    recommendation?: string;
    source?: string;
    q?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page));
    qs.set("limit", String(params.limit));
    if (params.recommendation) qs.set("recommendation", params.recommendation);
    if (params.source) qs.set("source", params.source);
    if (params.q) qs.set("q", params.q);
    return request<MaterialList>(`/api/materials?${qs}`);
  },
  analyze: (id: string) =>
    request<{ material: Material }>(`/api/materials/${id}/analyze`, { method: "POST" }),
  generate: (id: string, platform: string) =>
    request<GenerateResponse>(`/api/materials/${id}/generate`, {
      method: "POST",
      body: JSON.stringify({ platform }),
    }),
  topics: () => request<{ topics: string[] }>("/api/topics", { method: "POST" }),

  // Channel scan trigger (DB row is created via Supabase directly; Python kicks off scan)
  scanChannel: (username: string) =>
    request<{ success: boolean; message: string }>("/api/channels/scan", {
      method: "POST",
      body: JSON.stringify({ username }),
    }),
};
