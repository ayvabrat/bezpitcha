import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/mock-api";

export const Route = createFileRoute("/channels")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["channels"], queryFn: () => api.getChannels() });
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");

  const addM = useMutation({
    mutationFn: (u: string) => api.addChannel(u),
    onSuccess: (r) => { toast.success(r.message); qc.invalidateQueries({ queryKey: ["channels"] }); setOpen(false); setUsername(""); },
  });
  const delM = useMutation({
    mutationFn: (u: string) => api.deleteChannel(u),
    onSuccess: () => { toast.success("Канал удалён"); qc.invalidateQueries({ queryKey: ["channels"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">📡 Мои каналы</h1>
          <p className="text-muted-foreground mt-1">Telegram-каналы для парсинга</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition">
          <Plus size={16} /> Добавить канал
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
              <tr key={c.id} className="border-t border-border hover:bg-secondary/40">
                <td className="px-4 py-3 font-medium">{c.username}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-md">{c.style_description}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{c.added_at}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => confirm(`Удалить ${c.username}?`) && delM.mutate(c.username)}
                    className="p-2 rounded hover:bg-destructive/20 text-destructive"
                  ><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
          >
            {addM.isPending ? "Сканирование..." : "Добавить и сканировать"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
