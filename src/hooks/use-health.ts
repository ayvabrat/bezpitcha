import { useEffect, useState } from "react";
import { subscribeHealth, type HealthSnapshot } from "@/lib/api-client";

export function useHealth(): HealthSnapshot {
  const [s, setS] = useState<HealthSnapshot>(() => ({
    status: "unknown",
    lastSuccessAt: null,
    lastErrorAt: null,
    lastError: null,
    latencyMs: null,
    consecutiveFailures: 0,
  }));
  useEffect(() => subscribeHealth(setS), []);
  return s;
}
