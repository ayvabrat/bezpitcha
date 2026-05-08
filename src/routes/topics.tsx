import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/topics")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const m = useMutation({
    mutationFn: () => apiClient.topics(),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">💡 Темы</h1>
        <p className="text-muted-foreground mt-1">AI предложит актуальные темы для постов</p>
      </div>

      <button
        onClick={() => m.mutate()}
        disabled={m.isPending}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-primary border border-accent text-primary-foreground hover:brightness-95 disabled:opacity-50 active:scale-[0.99] transition"
      >
        {m.isPending ? (
          <>
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Генерация...
          </>
        ) : (
          <>
            <Lightbulb size={18} /> Предложить темы
          </>
        )}
      </button>

      {m.data && (
        <ol className="space-y-3 animate-fade-in">
          {m.data.topics.map((t, i) => (
            <li key={i} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition">
              <span className="text-2xl font-semibold text-accent">{i + 1}</span>
              <span className="self-center">{t}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
