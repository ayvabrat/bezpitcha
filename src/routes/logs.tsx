import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { subscribeLogs, type LogEntry } from "@/lib/mock-api";

export const Route = createFileRoute("/logs")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

const colors = {
  info: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5",
  warning: "text-amber-400 border-amber-400/30 bg-amber-400/5",
  error: "text-rose-400 border-rose-400/30 bg-rose-400/5",
};

function Page() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeLogs((l) => setLogs((p) => [...p, l].slice(-200))), []);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📜 Логи</h1>
          <p className="text-muted-foreground mt-1">Реальное время • {logs.length} записей</p>
        </div>
        <button onClick={() => setLogs([])} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
          <Trash2 size={14} /> Очистить
        </button>
      </div>

      <div ref={ref} className="bg-card border border-border rounded-2xl p-4 h-[70vh] overflow-y-auto font-mono text-xs space-y-1.5">
        {logs.length === 0 && <div className="text-muted-foreground text-center py-8">Ожидание логов...</div>}
        {logs.map((l, i) => (
          <div key={i} className={`flex gap-3 px-3 py-2 rounded border ${colors[l.level]}`}>
            <span className="text-muted-foreground shrink-0">{new Date(l.time).toLocaleTimeString("ru")}</span>
            <span className="uppercase text-[10px] font-bold shrink-0 self-center">{l.level}</span>
            <span className="text-foreground">{l.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
