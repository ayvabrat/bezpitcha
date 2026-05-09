import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/channels")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const scanM = useMutation({
    mutationFn: async (raw: string) => {
      const u = raw.startsWith("@") ? raw : "@" + raw;
      return apiClient.scanChannel(u);
    },
    onSuccess: (res) => {
      setResult(res);
      toast.success(res.message || "Сканирование запущено");
    },
    onError: (e: Error) => {
      setResult({ success: false, message: e.message });
      toast.error(e.message);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">📡 Каналы</h1>
        <p className="text-muted-foreground mt-1">Запустить сканирование Telegram-канала</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <label className="text-sm text-muted-foreground block">Username канала</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="@username"
          className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none"
        />
        <button
          disabled={!username || scanM.isPending}
          onClick={() => scanM.mutate(username)}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition flex items-center justify-center gap-2"
        >
          {scanM.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Сканирование...
            </>
          ) : (
            <><Plus size={16} /> Сканировать</>
          )}
        </button>
      </div>

      {result && (
        <div className={`rounded-2xl p-4 border animate-fade-in ${result.success ? "bg-primary/10 border-primary/40" : "bg-destructive/10 border-destructive/40"}`}>
          <div className="text-sm font-medium">{result.success ? "✅ Успех" : "❌ Ошибка"}</div>
          <div className="text-sm text-muted-foreground mt-1 break-words">{result.message}</div>
        </div>
      )}
    </div>
  );
}
