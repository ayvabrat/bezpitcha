import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/mock-api";

export const Route = createFileRoute("/watermark")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["watermark"], queryFn: () => api.getWatermark() });
  const [opacity, setOpacity] = useState(data?.opacity ?? 0.5);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: (f: File) => api.uploadWatermark(f),
    onSuccess: () => { toast.success("Изображение загружено"); qc.invalidateQueries({ queryKey: ["watermark"] }); },
  });
  const saveOp = useMutation({
    mutationFn: (op: number) => api.setOpacity(op),
    onSuccess: () => toast.success("Непрозрачность сохранена"),
  });

  const handleFile = (f?: File | null) => {
    if (!f) return;
    if (!f.type.includes("png")) return toast.error("Только PNG-файлы");
    upload.mutate(f);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">🖼 Водяной знак</h1>
        <p className="text-muted-foreground mt-1">Изображение для наложения на медиа</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        className={`bg-card border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition ${drag ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
      >
        <Upload className="mx-auto text-muted-foreground" size={32} />
        <p className="mt-3 font-medium">Перетащите PNG или нажмите, чтобы выбрать</p>
        <input ref={inputRef} type="file" accept="image/png" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {data?.image_url && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="text-sm text-muted-foreground">Предпросмотр</div>
          <div className="bg-[conic-gradient(at_0_0,_#222_25%,_#333_25%_50%,_#222_50%_75%,_#333_75%)] bg-[length:20px_20px] rounded-lg p-4 flex justify-center">
            <img src={data.image_url} alt="Watermark" style={{ opacity }} className="max-h-48" />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm">Непрозрачность</label>
          <span className="text-sm font-mono text-primary">{Math.round(opacity * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-[var(--primary)]" />
        <button onClick={() => saveOp.mutate(opacity)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Сохранить</button>
      </div>
    </div>
  );
}
