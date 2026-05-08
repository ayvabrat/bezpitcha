import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Copy, Sparkles, Wand2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { apiClient, type Material } from "@/lib/api-client";
import { supabase } from "@/integrations/supabase/client";

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["materials", page, rec, source, q],
    queryFn: () => apiClient.materials({ page, limit: 20, recommendation: rec, source, q }),
    retry: 1,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["channels-list"],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("id, username");
      return data ?? [];
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const analyze = useMutation({
    mutationFn: (id: string) => apiClient.analyze(id),
    onSuccess: () => toast.success("Анализ завершён"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📋 Очередь материалов</h1>
        <p className="text-muted-foreground mt-1">{total} материалов</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔍 Поиск..." className="px-3 py-2 rounded-lg bg-input border border-border outline-none focus:border-primary transition" />
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

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-card border border-border rounded-xl p-6 text-sm text-muted-foreground">
          Не удалось загрузить материалы. Запустите Python-бэкенд (<code className="text-primary">VITE_API_BASE_URL</code>).
        </div>
      )}

      {!isLoading && !error && data?.items.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Нет материалов по выбранным фильтрам.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.items.map((m) => (
          <div key={m.id} className="bg-card border border-border rounded-2xl p-5 hover:border-primary/50 transition flex flex-col gap-3 animate-fade-in">
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
              <button
                onClick={() => analyze.mutate(m.id)}
                disabled={analyze.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm active:scale-[0.98] transition disabled:opacity-50"
              >
                <Sparkles size={14} /> Анализировать
              </button>
              <button
                onClick={() => setActive(m)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm active:scale-[0.98] transition"
              >
                <Wand2 size={14} /> Генерировать
              </button>
            </div>
          </div>
        ))}
      </div>

      {data && data.items.length > 0 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded border border-border disabled:opacity-30 hover:bg-secondary transition"><ChevronLeft size={16} /></button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded border border-border disabled:opacity-30 hover:bg-secondary transition"><ChevronRight size={16} /></button>
        </div>
      )}

      <GenerateModal material={active} onClose={() => setActive(null)} />
    </div>
  );
}

function GenerateModal({ material, onClose }: { material: Material | null; onClose: () => void }) {
  const [platform, setPlatform] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const gen = useMutation({
    mutationFn: ({ id, p }: { id: string; p: string }) => apiClient.generate(id, p),
    onSuccess: (r) => { setResult(r.content); setTitle(r.title); },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = () => { setPlatform(""); setResult(""); setTitle(""); setCopied(false); onClose(); };

  const copy = async () => {
    const text = title ? `${title}\n\n${result}` : result;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Скопировано в буфер обмена", { icon: <Check size={16} className="text-emerald-500" /> });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={!!material} onClose={close} title="🪄 Генерация поста" wide>
      {material && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-lg p-3 text-sm max-h-32 overflow-y-auto">
            <div className="text-xs text-muted-foreground mb-1">Исходный текст:</div>
            {material.original_text.slice(0, 300)}...
          </div>

          {!result && !gen.isPending && (
            <>
              <div>
                <div className="text-sm text-muted-foreground mb-2">Выберите платформу:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-3 py-2 rounded-lg border text-sm transition active:scale-[0.97] ${platform === p ? "border-primary bg-primary/20" : "border-border hover:bg-secondary"}`}
                    >{p}</button>
                  ))}
                </div>
              </div>
              <button
                disabled={!platform}
                onClick={() => gen.mutate({ id: material.id, p: platform })}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium disabled:opacity-50 active:scale-[0.99] transition"
              >
                ✨ Сгенерировать
              </button>
            </>
          )}

          {gen.isPending && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 animate-fade-in">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-muted-foreground">Идёт анализ и генерация поста...</p>
              <p className="text-xs text-muted-foreground/60">Это может занять 10-30 секунд</p>
            </div>
          )}

          {result && (
            <div className="animate-fade-in space-y-3">
              {title && <div className="text-lg font-bold">{title}</div>}
              <div className="max-h-[50vh] overflow-y-auto bg-secondary/40 border border-border rounded-lg p-4 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
              <div className="flex gap-2">
                <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition">
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Скопировано" : "Копировать"}
                </button>
                <button onClick={close} className="px-4 py-2.5 rounded-lg border border-border hover:bg-secondary transition">Закрыть</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
