import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/styles")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface ChannelStyle {
  id: string;
  username: string;
  style_description: string;
}

function Page() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery<ChannelStyle[]>({
    queryKey: ["styles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("channels")
        .select("id, username, style_description")
        .order("username");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [edit, setEdit] = useState<ChannelStyle | null>(null);
  const [text, setText] = useState("");

  const m = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: string }) => {
      const { error } = await supabase.from("channels").update({ style_description: d }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Стиль сохранён");
      qc.invalidateQueries({ queryKey: ["styles"] });
      qc.invalidateQueries({ queryKey: ["channels"] });
      setEdit(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🎨 Стиль каналов</h1>
        <p className="text-muted-foreground mt-1">Описание стиля для генерации постов</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Сначала добавьте каналы на вкладке «Мои каналы».
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-2xl p-5 space-y-3 hover:border-primary/40 transition">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{s.username}</div>
                <button onClick={() => { setEdit(s); setText(s.style_description); }} className="p-2 rounded hover:bg-secondary active:scale-95 transition"><Pencil size={14} /></button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.style_description}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Стиль: ${edit?.username}`} wide>
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none resize-y"
          />
          <button
            disabled={m.isPending}
            onClick={() => edit && m.mutate({ id: edit.id, d: text })}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition"
          >{m.isPending ? "Сохранение..." : "Сохранить"}</button>
        </div>
      </Modal>
    </div>
  );
}
