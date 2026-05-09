import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowDown, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { connectLogs, type LogEntry, type LogsStatus } from "@/lib/logs-ws";

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
  const [status, setStatus] = useState<LogsStatus>("connecting");
  const [autoStick, setAutoStick] = useState(true);
  const [hasNew, setHasNew] = useState(false);
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warning" | "error">("all");
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return connectLogs({
      onMessage: (l) => setLogs((p) => [...p, l].slice(-1000)),
      onStatus: setStatus,
    });
  }, []);

  const filtered = logs.filter((l) =>
    (levelFilter === "all" || l.level === levelFilter) &&
    (!search || l.message.toLowerCase().includes(search.toLowerCase()))
  );

  // Auto-scroll only if user is near bottom
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (autoStick) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setHasNew(false);
    } else {
      setHasNew(true);
    }
  }, [filtered.length, autoStick]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoStick(nearBottom);
    if (nearBottom) setHasNew(false);
  };

  const jumpDown = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAutoStick(true);
    setHasNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">📜 Логи</h1>
          <p className="text-muted-foreground mt-1">Реальное время • {filtered.length} / {logs.length} записей</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full border ${
            status === "open" ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/10"
            : status === "connecting" ? "border-amber-400/40 text-amber-400 bg-amber-400/10"
            : "border-rose-400/40 text-rose-400 bg-rose-400/10"
          }`}>
            {status === "open" ? "● подключено" : status === "connecting" ? "● подключение..." : "● отключено"}
          </span>
          <button onClick={() => setLogs([])} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm transition active:scale-[0.98]">
            <Trash2 size={14} /> Очистить
          </button>
        </div>
      </div>

      {status !== "open" && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm animate-fade-in">
          <AlertCircle size={16} />
          {status === "connecting" ? "Соединение устанавливается..." : "Соединение потеряно, переподключение..."}
        </div>
      )}

      <div className="relative">
        <div
          ref={ref}
          onScroll={onScroll}
          className="bg-card border border-border rounded-2xl p-4 h-[70vh] overflow-y-auto font-mono text-xs space-y-1.5"
        >
          {logs.length === 0 && <div className="text-muted-foreground text-center py-8">Ожидание логов...</div>}
          {logs.map((l, i) => (
            <div key={i} className={`flex gap-3 px-3 py-2 rounded border animate-fade-in ${colors[l.level] ?? colors.info}`}>
              <span className="text-muted-foreground shrink-0">{new Date(l.time).toLocaleTimeString("ru")}</span>
              <span className="uppercase text-[10px] font-bold shrink-0 self-center">{l.level}</span>
              <span className="text-foreground break-all">{l.message}</span>
            </div>
          ))}
        </div>

        {hasNew && !autoStick && (
          <button
            onClick={jumpDown}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground text-xs shadow-lg animate-fade-in active:scale-95 transition"
          >
            <ArrowDown size={14} /> Новые сообщения
          </button>
        )}
      </div>
    </div>
  );
}
