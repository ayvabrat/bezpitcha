import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/topics")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface HistoryEntry {
  at: string;
  topics: string[];
}
const KEY = "bezpitcha_topics_history";

function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: HistoryEntry[]) { localStorage.setItem(KEY, JSON.stringify(h.slice(0, 20))); }

function Page() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);

  const m = useMutation({
    mutationFn: () => apiClient.topics(),
    onSuccess: (r) => {
      const next = [{ at: new Date().toISOString(), topics: r.topics }, ...loadHistory()].slice(0, 20);
      setHistory(next);
      saveHistory(next);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = () => { setHistory([]); saveHistory([]); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">💡 Темы</h1>
        <p className="text-muted-foreground mt-1">AI предложит актуальные темы для постов</p>
      </div>

      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary border border-accent text-primary-foreground hover:brightness-95 disabled:opacity-50 active:scale-[0.99] transition"
      >
        {m.isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Генерация...
          </>
        ) : (
          <><Lightbulb size={18} /> Предложить темы</>
        )}
      </button>

      {m.data && (
        <ol className="space-y-3 animate-fade-in">
          {m.data.topics.map((t, i) => (
            <li key={i} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition">
              <span className="text-2xl font-semibold text-accent">{i + 1}</span>
              <span className="self-center">{t}</span>
            </li>
          ))}
        </ol>
      )}

      {history.length > 0 && (
        <div className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Clock size={16} /> История</h2>
            <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1">
              <Trash2 size={12} /> Очистить
            </button>
          </div>
          {history.map((h) => (
            <details key={h.at} className="bg-card border border-border rounded-xl p-4 group">
              <summary className="cursor-pointer text-sm flex items-center justify-between">
                <span>{new Date(h.at).toLocaleString("ru")}</span>
                <span className="text-muted-foreground text-xs">{h.topics.length} тем</span>
              </summary>
              <ul className="mt-3 space-y-1.5 text-sm">
                {h.topics.map((t, i) => <li key={i} className="text-muted-foreground">• {t}</li>)}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
