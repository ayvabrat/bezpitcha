import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/mock-api";

export const Route = createFileRoute("/styles")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["styles"], queryFn: () => api.getStyles() });
  const [edit, setEdit] = useState<{ channel: string; description: string } | null>(null);
  const [text, setText] = useState("");

  const m = useMutation({
    mutationFn: ({ ch, d }: { ch: string; d: string }) => api.updateStyle(ch, d),
    onSuccess: () => { toast.success("Стиль сохранён"); qc.invalidateQueries({ queryKey: ["styles"] }); setEdit(null); },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🎨 Стиль каналов</h1>
        <p className="text-muted-foreground mt-1">Описание стиля для генерации постов</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((s) => (
          <div key={s.channel} className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{s.channel}</div>
              <button onClick={() => { setEdit(s); setText(s.description); }} className="p-2 rounded hover:bg-secondary"><Pencil size={14} /></button>
            </div>
            <p className="text-sm text-muted-foreground">{s.description}</p>
          </div>
        ))}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Стиль: ${edit?.channel}`} wide>
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none resize-y"
          />
          <button
            disabled={m.isPending}
            onClick={() => edit && m.mutate({ ch: edit.channel, d: text })}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >{m.isPending ? "Сохранение..." : "Сохранить"}</button>
        </div>
      </Modal>
    </div>
  );
}
