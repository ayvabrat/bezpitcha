import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { supabase } from "@/integrations/supabase/client";
import { apiClient } from "@/lib/api-client";
import { useSession } from "@/lib/supabase-auth";

export const Route = createFileRoute("/channels")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface Channel {
  id: string;
  username: string;
  style_description: string;
  added_at: string;
}

function Page() {
  const qc = useQueryClient();
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");

  const { data = [], isLoading } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("id, username, style_description, added_at")
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel("channels-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, () => {
        qc.invalidateQueries({ queryKey: ["channels"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, qc]);

  const addM = useMutation({
    mutationFn: async (raw: string) => {
      const u = raw.startsWith("@") ? raw : "@" + raw;
      if (!session) throw new Error("Не авторизован");
      const { error } = await supabase.from("channels").insert({
        user_id: session.user.id,
        username: u,
      });
      if (error) throw error;
      // Trigger Python-side scan (non-blocking; backend may not be up yet)
      try { await apiClient.scanChannel(u); } catch (e) {
        console.warn("Scan trigger failed (Python API offline?):", e);
      }
      return u;
    },
    onSuccess: (u) => {
      toast.success(`Канал ${u} добавлен`);
      qc.invalidateQueries({ queryKey: ["channels"] });
      setOpen(false);
      setUsername("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Канал удалён"); qc.invalidateQueries({ queryKey: ["channels"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">📡 Мои каналы</h1>
          <p className="text-muted-foreground mt-1">Telegram-каналы для парсинга</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition">
          <Plus size={16} /> Добавить канал
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-secondary/40 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            Каналов пока нет. Нажмите «Добавить канал», чтобы начать.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Канал</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Стиль</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Добавлен</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/40 transition">
                  <td className="px-4 py-3 font-medium">{c.username}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-md">{c.style_description}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{new Date(c.added_at).toLocaleDateString("ru")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => confirm(`Удалить ${c.username}?`) && delM.mutate(c.id)}
                      className="p-2 rounded hover:bg-destructive/20 text-destructive transition active:scale-95"
                    ><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Добавить канал">
        <div className="space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none"
          />
          <button
            disabled={!username || addM.isPending}
            onClick={() => addM.mutate(username)}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition"
          >
            {addM.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Сканирование...
              </span>
            ) : "Добавить и сканировать"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
