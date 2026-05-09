import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/watermark")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["watermark"],
    queryFn: ({ signal }) => apiClient.watermark(signal),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">🖼 Водяной знак</h1>
          <p className="text-muted-foreground mt-1">Текущие настройки водяного знака на бэкенде</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Обновить
        </button>
      </div>

      {isLoading && (
        <div className="bg-card border border-border rounded-2xl p-8 animate-pulse h-64" />
      )}

      {error && (
        <div className="bg-card border border-border rounded-xl p-5 text-sm">
          <div className="flex items-center gap-2 text-rose-400 font-medium">
            <AlertTriangle size={16} /> Не удалось загрузить настройки
          </div>
          <div className="text-muted-foreground mt-1">{(error as Error).message}</div>
        </div>
      )}

      {data && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5 animate-fade-in">
          {data.image_url ? (
            <div>
              <div className="text-sm text-muted-foreground mb-3">Предпросмотр</div>
              <div className="bg-[conic-gradient(at_0_0,_#222_25%,_#333_25%_50%,_#222_50%_75%,_#333_75%)] bg-[length:20px_20px] rounded-lg p-6 flex justify-center">
                <img
                  src={data.image_url}
                  alt="Watermark"
                  style={{ opacity: data.opacity ?? 1 }}
                  className="max-h-48 object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              Изображение водяного знака не задано на бэкенде.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Непрозрачность</div>
              <div className="font-mono mt-1">{Math.round((data.opacity ?? 0) * 100)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Источник</div>
              <div className="font-mono mt-1 truncate">{data.image_url ? "API" : "—"}</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t border-border pt-3">
            Изменение водяного знака пока выполняется на стороне Telegram-бота / бэкенда.
            Когда появится <code className="text-primary">PUT /api/watermark</code>, добавим редактирование сюда.
          </div>
        </div>
      )}
    </div>
  );
}
