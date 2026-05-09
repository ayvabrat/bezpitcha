import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/channels")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface Channel {
  username: string;
  added_at: string;
  last_scan_at: string | null;
  last_status: "success" | "error" | "pending";
  last_message: string;
}

const STORAGE_KEY = "bezpitcha_channels";

function loadChannels(): Channel[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Channel[]) : [];
  } catch {
    return [];
  }
}

function saveChannels(list: Channel[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function Page() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [username, setUsername] = useState("");

  useEffect(() => { setChannels(loadChannels()); }, []);

  const update = (next: Channel[]) => {
    setChannels(next);
    saveChannels(next);
  };

  const upsert = (u: string, patch: Partial<Channel>) => {
    const list = loadChannels();
    const idx = list.findIndex((c) => c.username === u);
    if (idx === -1) {
      list.unshift({
        username: u,
        added_at: new Date().toISOString(),
        last_scan_at: null,
        last_status: "pending",
        last_message: "",
        ...patch,
      });
    } else {
      list[idx] = { ...list[idx], ...patch };
    }
    update(list);
  };

  const scanM = useMutation({
    mutationFn: async (raw: string) => {
      const u = raw.startsWith("@") ? raw : "@" + raw;
      upsert(u, { last_status: "pending", last_message: "Сканирование..." });
      try {
        const res = await apiClient.scanChannel(u);
        upsert(u, {
          last_scan_at: new Date().toISOString(),
          last_status: res.success ? "success" : "error",
          last_message: res.message || (res.success ? "Готово" : "Ошибка"),
        });
        return { u, res };
      } catch (e) {
        upsert(u, {
          last_scan_at: new Date().toISOString(),
          last_status: "error",
          last_message: (e as Error).message,
        });
        throw e;
      }
    },
    onSuccess: ({ u, res }) => {
      toast.success(`${u}: ${res.message || "сканирование запущено"}`);
      setUsername("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = (u: string) => {
    if (!confirm(`Удалить ${u}?`)) return;
    update(channels.filter((c) => c.username !== u));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📡 Каналы</h1>
        <p className="text-muted-foreground mt-1">Telegram-каналы для парсинга</p>
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

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {channels.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Каналов пока нет. Добавьте первый канал выше.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Канал</th>
                <th className="text-left px-4 py-3">Статус</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Сообщение</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Добавлен</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Последний скан</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.username} className="border-t border-border hover:bg-secondary/40 transition">
                  <td className="px-4 py-3 font-medium">{c.username}</td>
                  <td className="px-4 py-3">
                    {c.last_status === "success" && (
                      <span className="inline-flex items-center gap-1 text-primary"><CheckCircle2 size={14} /> OK</span>
                    )}
                    {c.last_status === "error" && (
                      <span className="inline-flex items-center gap-1 text-destructive"><XCircle size={14} /> ошибка</span>
                    )}
                    {c.last_status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        в процессе
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-xs">{c.last_message || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{new Date(c.added_at).toLocaleDateString("ru")}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {c.last_scan_at ? new Date(c.last_scan_at).toLocaleString("ru") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => scanM.mutate(c.username)}
                        disabled={scanM.isPending}
                        title="Пересканировать"
                        className="p-2 rounded hover:bg-primary/20 text-primary transition active:scale-95 disabled:opacity-50"
                      ><RefreshCw size={16} /></button>
                      <button
                        onClick={() => remove(c.username)}
                        title="Удалить"
                        className="p-2 rounded hover:bg-destructive/20 text-destructive transition active:scale-95"
                      ><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
