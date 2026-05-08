import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/dashboard")({
  component: () => (
    <AuthGate>
      <AppShell><Page /></AppShell>
    </AuthGate>
  ),
});

const cards = [
  { key: "parsed_total", label: "Всего материалов", icon: "📦", color: "from-violet-500 to-purple-500" },
  { key: "queue_count", label: "В очереди", icon: "⏳", color: "from-blue-500 to-cyan-500" },
  { key: "published_today", label: "Опубликовано сегодня", icon: "🚀", color: "from-emerald-500 to-teal-500" },
  { key: "published_week", label: "За неделю", icon: "📈", color: "from-amber-500 to-orange-500" },
  { key: "rejected_total", label: "Отклонено", icon: "🗑", color: "from-rose-500 to-red-500" },
] as const;

function Page() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => apiClient.stats(),
    retry: 1,
  });

  useEffect(() => {
    if (error) toast.error(`Не удалось загрузить статистику: ${(error as Error).message}`);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📊 Дашборд</h1>
        <p className="text-muted-foreground mt-1">Сводная статистика парсера</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.key} className="relative overflow-hidden bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition-all hover:-translate-y-0.5">
            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${c.color} opacity-20 blur-2xl`} />
            <div className="text-3xl">{c.icon}</div>
            <div className="mt-3 text-sm text-muted-foreground">{c.label}</div>
            <div className="mt-1 text-3xl font-bold">
              {isLoading ? (
                <span className="inline-block w-16 h-7 bg-secondary rounded animate-pulse" />
              ) : error ? (
                "—"
              ) : (
                ((data as Record<string, number>)?.[c.key] ?? 0).toLocaleString("ru")
              )}
            </div>
          </div>
        ))}
      </div>
      {error && (
        <div className="text-sm text-muted-foreground bg-card border border-border rounded-xl p-4">
          Backend недоступен. Проверьте, что Python API запущен на <code className="text-primary">VITE_API_BASE_URL</code>.
        </div>
      )}
    </div>
  );
}
