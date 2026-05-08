import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/supabase-auth";

export const Route = createFileRoute("/watermark")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

interface WMSettings {
  image_path: string | null;
  opacity: number;
  signed_url: string | null;
}

function Page() {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id;
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery<WMSettings>({
    queryKey: ["watermark", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: row } = await supabase
        .from("watermark_settings")
        .select("image_path, opacity")
        .eq("user_id", userId!)
        .maybeSingle();
      let signed_url: string | null = null;
      if (row?.image_path) {
        const { data: s } = await supabase.storage.from("watermarks").createSignedUrl(row.image_path, 3600);
        signed_url = s?.signedUrl ?? null;
      }
      return { image_path: row?.image_path ?? null, opacity: row?.opacity ?? 0.5, signed_url };
    },
  });

  const [opacity, setOpacity] = useState(0.5);
  useEffect(() => { if (data) setOpacity(data.opacity); }, [data]);

  const upload = useMutation({
    mutationFn: async (f: File) => {
      if (!userId) throw new Error("Не авторизован");
      const path = `${userId}/watermark.png`;
      const { error: upErr } = await supabase.storage.from("watermarks").upload(path, f, {
        upsert: true,
        contentType: "image/png",
      });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase
        .from("watermark_settings")
        .upsert({ user_id: userId, image_path: path, opacity, updated_at: new Date().toISOString() });
      if (dbErr) throw dbErr;
    },
    onSuccess: () => { toast.success("Изображение загружено"); qc.invalidateQueries({ queryKey: ["watermark", userId] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveOp = useMutation({
    mutationFn: async (op: number) => {
      if (!userId) throw new Error("Не авторизован");
      const { error } = await supabase
        .from("watermark_settings")
        .upsert({ user_id: userId, opacity: op, image_path: data?.image_path ?? null, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Непрозрачность сохранена"); qc.invalidateQueries({ queryKey: ["watermark", userId] }); },
    onError: (e: Error) => toast.error(e.message),
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
        {upload.isPending ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto text-muted-foreground" size={32} />
            <p className="mt-3 font-medium">Перетащите PNG или нажмите, чтобы выбрать</p>
          </>
        )}
        <input ref={inputRef} type="file" accept="image/png" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>

      {data?.signed_url && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="text-sm text-muted-foreground">Предпросмотр</div>
          <div className="bg-[conic-gradient(at_0_0,_#222_25%,_#333_25%_50%,_#222_50%_75%,_#333_75%)] bg-[length:20px_20px] rounded-lg p-4 flex justify-center">
            <img src={data.signed_url} alt="Watermark" style={{ opacity }} className="max-h-48" />
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm">Непрозрачность</label>
          <span className="text-sm font-mono text-primary">{Math.round(opacity * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.01} value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-full accent-[var(--primary)]" />
        <button
          onClick={() => saveOp.mutate(opacity)}
          disabled={saveOp.isPending}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 active:scale-[0.99] transition"
        >{saveOp.isPending ? "Сохранение..." : "Сохранить"}</button>
      </div>
    </div>
  );
}
