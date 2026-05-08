import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/supabase-auth";

export const Route = createFileRoute("/")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useSession();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionLoading && session) navigate({ to: "/dashboard" });
  }, [session, sessionLoading, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pwd,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Аккаунт создан, входим...");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pwd });
        if (error) throw error;
        toast.success("Добро пожаловать!");
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message || "Ошибка авторизации");
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
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setMode("login")} className={`flex-1 py-2 rounded-lg text-sm transition ${mode === "login" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>Вход</button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg text-sm transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>Регистрация</button>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@example.com" className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none transition" />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Пароль</label>
            <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6} placeholder="••••••••" className="w-full px-4 py-3 rounded-lg bg-input border border-border focus:border-primary outline-none transition" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}
          </button>
        </form>
      </div>
    </div>
  );
}
