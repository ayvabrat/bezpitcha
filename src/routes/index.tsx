import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (auth.isAuthenticated()) navigate({ to: "/dashboard" });
  }, [navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.login(pwd);
      toast.success("Добро пожаловать!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.4_0.2_295/0.4),transparent_50%),radial-gradient(circle_at_70%_80%,oklch(0.4_0.2_260/0.4),transparent_50%)]" />
      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            ⚡ BezPitcha
          </h1>
          <p className="mt-2 text-muted-foreground">Admin Panel</p>
        </div>
        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-8 shadow-2xl space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Пароль</label>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
}
