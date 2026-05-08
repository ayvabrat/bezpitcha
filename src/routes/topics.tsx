import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { AppShell } from "@/components/Sidebar";
import { AuthGate } from "@/components/AuthGate";
import { api } from "@/lib/mock-api";

export const Route = createFileRoute("/topics")({
  component: () => (<AuthGate><AppShell><Page /></AppShell></AuthGate>),
});

function Page() {
  const m = useMutation({ mutationFn: () => api.getTopics() });
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold">💡 Темы</h1>
        <p className="text-muted-foreground mt-1">AI предложит актуальные темы для постов</p>
      </div>

      <button onClick={() => m.mutate()} disabled={m.isPending} className="flex items-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 disabled:opacity-50">
        <Lightbulb size={18} /> {m.isPending ? "Генерация..." : "Предложить темы"}
      </button>

      {m.data && (
        <ol className="space-y-3 animate-fade-in">
          {m.data.map((t, i) => (
            <li key={i} className="bg-card border border-border rounded-xl p-4 flex gap-4 hover:border-primary/50 transition">
              <span className="text-2xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{i + 1}</span>
              <span className="self-center">{t}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
