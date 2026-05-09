import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, WifiOff, RefreshCw } from "lucide-react";
import { apiClient, markDegraded } from "@/lib/api-client";
import { useHealth } from "@/hooks/use-health";

// Active health probe: pings /api/stats every 10s.
// On failure, retries with backoff handled by react-query.
export function HealthBadge() {
  const health = useHealth();
  const [now, setNow] = useState(Date.now());

  const { refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["health-ping"],
    queryFn: async () => {
      const r = await apiClient.ping();
      if (r.ok && r.degraded) markDegraded(r.reason ?? "degraded");
      return r;
    },
    refetchInterval: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const status = health.status;
  const cls =
    status === "online"   ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/10"
    : status === "degraded" ? "border-amber-400/40 text-amber-400 bg-amber-400/10"
    : status === "offline"  ? "border-rose-400/40 text-rose-400 bg-rose-400/10"
    : "border-border text-muted-foreground bg-secondary/40";

  const Icon = status === "online" ? Activity : status === "offline" ? WifiOff : AlertTriangle;

  const label =
    status === "online"   ? "API онлайн"
    : status === "degraded" ? "API деградирован"
    : status === "offline"  ? "API недоступен"
    : "проверка…";

  const ageS = health.lastSuccessAt ? Math.max(0, Math.round((now - health.lastSuccessAt) / 1000)) : null;

  return (
    <div className={`group relative px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${cls}`}>
      <Icon size={12} className={isFetching ? "animate-pulse" : ""} />
      <span className="font-medium">{label}</span>
      {health.latencyMs != null && status === "online" && (
        <span className="opacity-70">· {health.latencyMs}ms</span>
      )}
      <button
        onClick={() => refetch()}
        title="Проверить сейчас"
        className="opacity-60 hover:opacity-100 transition"
      >
        <RefreshCw size={11} className={isFetching ? "animate-spin" : ""} />
      </button>

      {/* Tooltip */}
      <div className="absolute right-0 top-full mt-2 z-50 hidden group-hover:block w-72 bg-popover border border-border rounded-lg p-3 text-xs shadow-2xl space-y-1">
        <div className="font-semibold text-foreground">Состояние API</div>
        <div className="text-muted-foreground">
          {ageS != null ? `Последний успех: ${ageS}s назад` : "Ещё нет успешных ответов"}
        </div>
        {health.latencyMs != null && (
          <div className="text-muted-foreground">Задержка: {health.latencyMs}ms</div>
        )}
        {health.lastError && (
          <div className="text-rose-400 break-words">Ошибка: {health.lastError}</div>
        )}
        {health.consecutiveFailures > 0 && (
          <div className="text-amber-400">Подряд ошибок: {health.consecutiveFailures}</div>
        )}
        <div className="text-muted-foreground/70 pt-1">
          Авто-проверка каждые 10s. Последняя: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("ru") : "—"}
        </div>
      </div>
    </div>
  );
}
