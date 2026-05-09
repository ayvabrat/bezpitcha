import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Copy, Sparkles, Wand2, ChevronLeft, ChevronRight, Check, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { Modal } from "@/components/Modal";
import { useServerFn } from "@tanstack/react-start";
import { apiClient, type Material } from "@/lib/api-client";
import { listMaterials, analyzeMaterial, generatePost } from "@/lib/materials.functions";
import { taskStore, useTask } from "@/lib/task-store";

export const Route = createFileRoute("/queue")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

const recIcon: Record<string, string> = { publish: "✅", maybe: "🤔", skip: "❌" };
const recLabel: Record<string, string> = { publish: "Публиковать", maybe: "Возможно", skip: "Пропустить" };
const platforms = ["telegram", "vk", "x", "dzen", "vc", "instagram", "threads", "youtube"];

function Page() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [rec, setRec] = useState("");
  const [source, setSource] = useState("");
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Material | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["materials", page, rec, source, q],
    queryFn: ({ signal }) => apiClient.materials({ page, limit: 20, recommendation: rec, source, q }, signal),
    refetchInterval: 15_000,
    staleTime: 0,
  });

  // Distinct sources from current page (best effort, until API provides /channels)
  const sourceOptions = useMemo(() => {
    const s = new Set<string>();
    data?.items.forEach((m) => m.source_name && s.add(m.source_name));
    return Array.from(s).sort();
  }, [data]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const analyzeMaterialFn = useServerFn(analyzeMaterial);
  const analyzeOne = async (id: string): Promise<boolean> => {
    if (taskStore.isRunning("analyze", id)) return false;
    taskStore.start("analyze", id);
    try {
      await analyzeMaterialFn({ data: { id } });
      taskStore.finish("analyze", id, true, "Анализ завершён");
      return true;
    } catch (e) {
      taskStore.finish("analyze", id, false, (e as Error).message);
      throw e;
    }
  };

  const analyzeM = useMutation({
    mutationFn: analyzeOne,
    onSuccess: () => {
      toast.success("Анализ завершён");
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkAnalyzeM = useMutation({
    mutationFn: async (ids: string[]) => {
      let ok = 0, fail = 0;
      for (const id of ids) {
        try { await analyzeOne(id); ok++; } catch { fail++; }
      }
      return { ok, fail };
    },
    onSuccess: ({ ok, fail }) => {
      toast.success(`Готово: ${ok} ✓ / ${fail} ✗`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["materials"] });
    },
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allOnPage = data?.items.map((m) => m.id) ?? [];
  const allSelected = allOnPage.length > 0 && allOnPage.every((id) => selected.has(id));
  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) { allOnPage.forEach((id) => next.delete(id)); }
      else { allOnPage.forEach((id) => next.add(id)); }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">📋 Очередь материалов</h1>
          <p className="text-muted-foreground mt-1">{total} материалов{isFetching ? " · обновление…" : ""}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm"
        >
          <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Обновить
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="🔍 Поиск..." className="px-3 py-2 rounded-lg bg-input border border-border outline-none focus:border-primary transition" />
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-input border border-border">
          <option value="">Все источники</option>
          {sourceOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={rec} onChange={(e) => { setRec(e.target.value); setPage(1); }} className="px-3 py-2 rounded-lg bg-input border border-border">
          <option value="">Все рекомендации</option>
          <option value="publish">✅ Публиковать</option>
          <option value="maybe">🤔 Возможно</option>
          <option value="skip">❌ Пропустить</option>
        </select>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="accent-[var(--primary)]" />
            Выбрать всё
          </label>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-primary/40 bg-primary/10 animate-fade-in">
          <span className="text-sm">Выбрано: <strong>{selected.size}</strong></span>
          <div className="flex items-center gap-2">
            <button
              disabled={bulkAnalyzeM.isPending}
              onClick={() => bulkAnalyzeM.mutate(Array.from(selected))}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {bulkAnalyzeM.isPending && <Loader2 size={14} className="animate-spin" />}
              <Sparkles size={14} /> Анализировать выбранные
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-secondary"
            >Очистить</button>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="bg-card border border-border rounded-xl p-6 text-sm">
          <div className="text-rose-400 font-medium">Не удалось загрузить материалы</div>
          <div className="text-muted-foreground mt-1">{(error as Error).message}</div>
          <button onClick={() => refetch()} className="mt-3 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm flex items-center gap-2">
            <RefreshCw size={14} /> Повторить
          </button>
        </div>
      )}

      {!isLoading && !error && data?.items.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          Нет материалов по выбранным фильтрам.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.items.map((m) => (
          <MaterialCard
            key={m.id}
            material={m}
            selected={selected.has(m.id)}
            onSelectToggle={() => toggleSelect(m.id)}
            onAnalyze={() => analyzeM.mutate(m.id)}
            onGenerate={() => setActive(m)}
          />
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

function MaterialCard({
  material: m,
  selected,
  onSelectToggle,
  onAnalyze,
  onGenerate,
}: {
  material: Material;
  selected: boolean;
  onSelectToggle: () => void;
  onAnalyze: () => void;
  onGenerate: () => void;
}) {
  const analyzeTask = useTask("analyze", m.id);
  const generateTask = useTask("generate", m.id);
  const isAnalyzing = analyzeTask?.state === "running" || analyzeTask?.state === "queued";

  return (
    <div className={`bg-card border rounded-2xl p-5 hover:border-primary/50 transition flex flex-col gap-3 animate-fade-in ${selected ? "border-primary" : "border-border"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={selected} onChange={onSelectToggle} className="mt-1 accent-[var(--primary)]" />
          <div>
            <div className="text-sm text-muted-foreground">{m.source_name}</div>
            <div className="text-xs text-muted-foreground/70">{new Date(m.parsed_at).toLocaleString("ru")}</div>
          </div>
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
      <TaskBadges analyze={analyzeTask} generate={generateTask} />
      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:bg-secondary text-sm active:scale-[0.98] transition disabled:opacity-50"
        >
          {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isAnalyzing ? "Анализ…" : "Анализировать"}
        </button>
        <button
          onClick={onGenerate}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm active:scale-[0.98] transition"
        >
          <Wand2 size={14} /> Генерировать
        </button>
      </div>
    </div>
  );
}

function TaskBadges({ analyze, generate }: { analyze?: ReturnType<typeof useTask>; generate?: ReturnType<typeof useTask> }) {
  const items = [analyze, generate].filter(Boolean) as NonNullable<ReturnType<typeof useTask>>[];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {items.map((t) => {
        const label = t.kind === "analyze" ? "Анализ" : "Генерация";
        const cls =
          t.state === "running" ? "border-amber-400/40 text-amber-400 bg-amber-400/10" :
          t.state === "done"    ? "border-emerald-400/40 text-emerald-400 bg-emerald-400/10" :
          t.state === "failed"  ? "border-rose-400/40 text-rose-400 bg-rose-400/10" :
                                  "border-border text-muted-foreground";
        const Icon = t.state === "running" ? Loader2 : t.state === "done" ? CheckCircle2 : XCircle;
        return (
          <span key={t.kind} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border ${cls}`}>
            <Icon size={11} className={t.state === "running" ? "animate-spin" : ""} />
            {label}: {t.state}
          </span>
        );
      })}
    </div>
  );
}

function GenerateModal({ material, onClose }: { material: Material | null; onClose: () => void }) {
  const [platform, setPlatform] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const generatePostFn = useServerFn(generatePost);
  const gen = useMutation({
    mutationFn: async ({ id, p }: { id: string; p: string }) => {
      taskStore.start("generate", id, { platform: p });
      try {
        const r = await generatePostFn({ data: { id, platform: p } });
        taskStore.finish("generate", id, true, `Готово (${p})`);
        return r;
      } catch (e) {
        taskStore.finish("generate", id, false, (e as Error).message);
        throw e;
      }
    },
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
                className="w-full py-3 rounded-full bg-primary border border-accent text-primary-foreground font-medium disabled:opacity-50 active:scale-[0.99] hover:brightness-95 transition"
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
