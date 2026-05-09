import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, Wifi, WifiOff } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { useServerFn } from "@tanstack/react-start";
import { scanChannel } from "@/lib/channels.functions";
import { connectLogs, type LogEntry, type LogsStatus } from "@/lib/logs-ws";

export const Route = createFileRoute("/channels")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface Channel {
  username: string;
  added_at: string;
  last_scan_at: string | null;
  last_status: "idle" | "scanning" | "success" | "error";
  last_message: string;
  progress: number; // 0..100
  log_lines: LogEntry[];
}

const STORAGE_KEY = "bezpitcha_channels";

function loadChannels(): Channel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? (JSON.parse(raw) as Channel[]) : [];
    return arr.map((c) => ({ ...c, progress: 0, log_lines: [], last_status: c.last_status === "scanning" ? "idle" : c.last_status }));
  } catch {
    return [];
  }
}

function saveChannels(list: Channel[]) {
  // do not persist transient log_lines / progress
  const slim = list.map(({ log_lines: _l, progress: _p, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
}

// Heuristic: parse known log patterns to derive progress for a channel scan.
// The Python backend emits messages like "🔍 Сканирование @durov...",
// "Получено N постов", "Анализ X/Y", "Готово". We bump progress on matches.
function deriveProgressBump(msg: string): number {
  const m = msg.toLowerCase();
  if (/start|начал|🔍|сканир/.test(m)) return 10;
  if (/получ|fetched|posts/.test(m)) return 35;
  if (/анализ|analyz/.test(m)) {
    const frac = /(\d+)\s*\/\s*(\d+)/.exec(msg);
    if (frac) {
      const cur = parseInt(frac[1], 10);
      const total = parseInt(frac[2], 10) || 1;
      return 35 + Math.min(60, Math.round((cur / total) * 60));
    }
    return 60;
  }
  if (/готово|done|complete|✅/.test(m)) return 100;
  if (/ошибк|error|fail|❌/.test(m)) return 100;
  return 0;
}

function Page() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [username, setUsername] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [wsStatus, setWsStatus] = useState<LogsStatus>("connecting");
  const channelsRef = useRef<Channel[]>([]);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initial = loadChannels();
    setChannels(initial);
    channelsRef.current = initial;
  }, []);

  useEffect(() => { channelsRef.current = channels; }, [channels]);

  // WS: stream global logs and route them per-channel by username match
  useEffect(() => {
    const disconnect = connectLogs({
      onStatus: setWsStatus,
      onMessage: (entry) => {
        setLogs((prev) => [...prev.slice(-499), entry]);
        const list = channelsRef.current;
        const matched = list.find((c) => entry.message.includes(c.username));
        if (!matched) return;
        const bump = deriveProgressBump(entry.message);
        setChannels((prev) =>
          prev.map((c) => {
            if (c.username !== matched.username) return c;
            const nextProgress = bump > 0 ? Math.max(c.progress, bump) : c.progress;
            return {
              ...c,
              progress: nextProgress,
              log_lines: [...c.log_lines.slice(-49), entry],
            };
          }),
        );
      },
    });
    return disconnect;
  }, []);

  // Auto-scroll log panel
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const update = (next: Channel[]) => {
    setChannels(next);
    saveChannels(next);
  };

  const upsert = (u: string, patch: Partial<Channel>) => {
    const list = [...channelsRef.current];
    const idx = list.findIndex((c) => c.username === u);
    if (idx === -1) {
      list.unshift({
        username: u,
        added_at: new Date().toISOString(),
        last_scan_at: null,
        last_status: "idle",
        last_message: "",
        progress: 0,
        log_lines: [],
        ...patch,
      });
    } else {
      list[idx] = { ...list[idx], ...patch };
    }
    update(list);
  };

  const scanChannelFn = useServerFn(scanChannel);
  const scanM = useMutation({
    mutationFn: async (raw: string) => {
      const u = raw.startsWith("@") ? raw : "@" + raw;
      upsert(u, { last_status: "scanning", last_message: "Запуск...", progress: 5, log_lines: [] });
      try {
        const res = await scanChannelFn({ data: { username: u } });
        upsert(u, {
          last_scan_at: new Date().toISOString(),
          last_status: res.success ? "success" : "error",
          last_message: res.message || (res.success ? "Готово" : "Ошибка"),
          progress: 100,
        });
        return { u, res };
      } catch (e) {
        upsert(u, {
          last_scan_at: new Date().toISOString(),
          last_status: "error",
          last_message: (e as Error).message,
          progress: 100,
        });
        throw e;
      }
    },
    onSuccess: ({ u, res }) => {
      toast.success(`${u}: ${res.message || "готово"}`);
      setUsername("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = (u: string) => {
    if (!confirm(`Удалить ${u}?`)) return;
    update(channels.filter((c) => c.username !== u));
  };

  const wsBadge = wsStatus === "open" ? (
    <span className="inline-flex items-center gap-1 text-xs text-primary"><Wifi size={12} /> логи в реальном времени</span>
  ) : wsStatus === "connecting" ? (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      подключение к логам…
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-destructive"><WifiOff size={12} /> логи отключены</span>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">📡 Каналы</h1>
          <p className="text-muted-foreground mt-1">Telegram-каналы для парсинга</p>
        </div>
        {wsBadge}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <label className="text-sm text-muted-foreground block">Добавить канал</label>
        <div className="flex gap-2">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && username && scanM.mutate(username)}
            placeholder="@username"
            className="flex-1 px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none"
          />
          <button
            disabled={!username || scanM.isPending}
            onClick={() => scanM.mutate(username)}
            className="px-5 py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition flex items-center gap-2"
          >
            {scanM.isPending ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (<Plus size={16} />)}
            Сканировать
          </button>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
          Каналов пока нет. Добавьте первый канал выше.
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map((c) => (
            <ChannelCard
              key={c.username}
              channel={c}
              onRescan={() => scanM.mutate(c.username)}
              onRemove={() => remove(c.username)}
              busy={scanM.isPending}
            />
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <div className="text-sm font-medium">📜 Логи бэкенда (real-time)</div>
          <button
            onClick={() => setLogs([])}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >Очистить</button>
        </div>
        <div className="bg-background/50 p-4 h-72 overflow-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">Ожидание сообщений…</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground shrink-0">{new Date(l.time).toLocaleTimeString("ru")}</span>
                <span className={
                  l.level === "error" ? "text-destructive" :
                  l.level === "warning" ? "text-yellow-400" : "text-foreground"
                }>{l.message}</span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  channel: c,
  onRescan,
  onRemove,
  busy,
}: {
  channel: Channel;
  onRescan: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const isScanning = c.last_status === "scanning";
  const barColor =
    c.last_status === "error" ? "bg-destructive" :
    c.last_status === "success" ? "bg-primary" :
    "bg-primary/70";

  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="font-semibold text-base">{c.username}</div>
          {c.last_status === "success" && (
            <span className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 size={14} /> готово</span>
          )}
          {c.last_status === "error" && (
            <span className="inline-flex items-center gap-1 text-xs text-destructive"><XCircle size={14} /> ошибка</span>
          )}
          {isScanning && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              сканирование
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRescan}
            disabled={busy || isScanning}
            title="Пересканировать"
            className="p-2 rounded hover:bg-primary/20 text-primary transition active:scale-95 disabled:opacity-50"
          ><RefreshCw size={16} /></button>
          <button
            onClick={onRemove}
            title="Удалить"
            className="p-2 rounded hover:bg-destructive/20 text-destructive transition active:scale-95"
          ><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="truncate">{c.last_message || "—"}</span>
          <span className="font-mono shrink-0">{c.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300 ${isScanning && c.progress < 100 ? "animate-pulse" : ""}`}
            style={{ width: `${c.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>Добавлен: {new Date(c.added_at).toLocaleString("ru")}</div>
        <div className="text-right">
          {c.last_scan_at ? `Скан: ${new Date(c.last_scan_at).toLocaleString("ru")}` : "Скан: —"}
        </div>
      </div>

      {c.log_lines.length > 0 && (
        <div className="bg-background/50 border border-border rounded-lg p-2 max-h-32 overflow-auto font-mono text-[11px] space-y-0.5">
          {c.log_lines.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground shrink-0">{new Date(l.time).toLocaleTimeString("ru")}</span>
              <span className={
                l.level === "error" ? "text-destructive" :
                l.level === "warning" ? "text-yellow-400" : "text-foreground"
              }>{l.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
