import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Copy, Sparkles, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { api, type Material } from "@/lib/mock-api";

export const Route = createFileRoute("/queue")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

const recIcon: Record<string, string> = { publish: "✅", maybe: "🤔", skip: "❌" };
const recLabel: Record<string, string> = { publish: "Публиковать", maybe: "Возможно", skip: "Пропустить" };
const platforms = ["telegram", "vk", "x", "dzen", "vc", "instagram", "threads", "youtube"];

function Page() {
  const [page, setPage] = useState(1);
  const [rec, setRec] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Material | null>(null);

  const { data } = useQuery({
    queryKey: ["materials", page, rec, source, q],
    queryFn: () => api.getMaterials({ page, limit: 20, recommendation: rec, source, q }),
  });
  const { data: channels = [] } = useQuery({ queryKey: ["channels"], queryFn: () => api.getChannels() });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const analyze = useMutation({
    mutationFn: (id: string) => api.analyze(id),
    onSuccess: () => toast.success("Анализ завершён"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📋 Очередь материалов</h1>
        <p className="text-muted-foreground mt-1">{total} материалов</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔍 Поиск..." className="px-3 py-2 rounded-lg bg-input border border-border outline-none focus:border-primary" />
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-input border border-border">
          <option value="">Все источники</option>
          {channels.map((c) => <option key={c.id} value={c.username}>{c.username}</option>)}
        </select>
        <select value={rec} onChange={(e) => { setRec(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-input border border-border">
          <option value="">Все рекомендации</option>
          <option value="publish">✅ Публиковать</option>
          <option value="maybe">🤔 Возможно</option>
          <option value="skip">❌ Пропустить</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.items.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">{m.source_name}</div>
                <div className="text-xs text-muted-foreground/70">{new Date(m.parsed_at).toLocaleString("ru")}</div>
              </div>
              <div className="text-2xl" title={recLabel[m.recommendation]}>{recIcon[m.recommendation]}</div>
            </div>

            <p className="text-sm line-clamp-3">{m.original_text.slice(0, 200)}...</p>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded bg-secondary">R: {m.relevance_score}</span>
              <span className="px-2 py-1 rounded bg-secondary">I: {m.interest_score}</span>
              <span className="px-2 py-1 rounded bg-secondary">A: {m.actuality_score}</span>
              {m.platforms.map((p) => <span key={p} className="px-2 py-1 rounded bg-primary/20 text-primary">{p}</span>)}
            </div>

            <div className="flex gap-2 mt-auto pt-2">
              <button onClick={() => analyze.mutate(m.id)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm">
                <Sparkles size={14} /> Анализировать
              </button>
              <button onClick={() => setActive(m)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm">
                <Wand2 size={14} /> Генерировать
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded border border-border disabled:opacity-30"><ChevronLeft size={16} /></button>
        <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded border border-border disabled:opacity-30"><ChevronRight size={16} /></button>
      </div>

      <GenerateModal material={active} onClose={() => setActive(null)} />
    </div>
  );
}

function GenerateModal({ material, onClose }: { material: Material | null; onClose: () => void }) {
  const [platform, setPlatform] = useState<string>("");
  const [result, setResult] = useState<string>("");

  const gen = useMutation({
    mutationFn: ({ id, p }: { id: string; p: string }) => api.generate(id, p),
    onSuccess: (r) => setResult(r.content),
  });

  const close = () => { setPlatform(""); setResult(""); onClose(); };

  const copy = async () => {
    await navigator.clipboard.writeText(result);
    toast.success("Скопировано в буфер обмена");
  };

  return (
    <Modal open={!!material} onClose={close} title="🪄 Генерация поста" wide>
      {material && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-sm max-h-32 overflow-y-auto">
            <div className="text-xs text-muted-foreground mb-1">Исходный текст:</div>
            {material.original_text.slice(0, 300)}...
          </div>

          {!result && (
            <>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Выберите платформу:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-2 rounded-lg border text-sm transition ${platform === p ? "border-primary bg-primary/20" : "border-border hover:bg-secondary"}`}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <button
                disabled={!platform || gen.isPending}
                onClick={() => gen.mutate({ id: material.id, p: platform })}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium disabled:opacity-50"
              >
                {gen.isPending ? (
                  <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> Генерация...</span>
                ) : "✨ Сгенерировать"}
              </button>
            </>
          )}

          {result && (
            <>
              <div className="max-h-[50vh] overflow-y-auto bg-secondary/40 border border-border rounded-lg p-4 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="flex gap-2">
                <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">
                  <Copy size={16} /> Копировать
                </button>
                <button onClick={close} className="px-4 py-2.5 rounded-lg border border-border hover:bg-secondary">Закрыть</button>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
