import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { login, isAuthed } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthed()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (login(pwd)) {
      toast.success("Добро пожаловать!");
      navigate({ to: "/dashboard" });
    } else {
      toast.error("Неверный пароль");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: "var(--gradient-sky-dream)" }}>
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-semibold tracking-tight text-foreground">
            ⚡ BezPitcha
          </h1>
          <p className="mt-2 text-muted-foreground text-sm">Admin Panel</p>
        </div>
        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Пароль</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              required
              autoFocus
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-primary border border-accent text-primary-foreground font-medium hover:brightness-95 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
