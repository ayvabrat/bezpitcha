import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { auth } from "@/lib/auth";
import { Menu, X, LogOut } from "lucide-react";

const items = [
  { to: "/dashboard", label: "Дашборд", icon: "📊" },
  { to: "/channels", label: "Мои каналы", icon: "📡" },
  { to: "/queue", label: "Очередь материалов", icon: "📋" },
  { to: "/styles", label: "Стиль каналов", icon: "🎨" },
  { to: "/watermark", label: "Водяной знак", icon: "🖼" },
  { to: "/topics", label: "Темы", icon: "💡" },
  { to: "/logs", label: "Логи", icon: "📜" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const logout = () => {
    auth.logout();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile topbar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar">
        <span className="font-bold text-lg">⚡ BezPitcha</span>
        <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-secondary">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-20 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            ⚡ BezPitcha
          </span>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((it) => {
            const active = path === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-sidebar-foreground hover:bg-secondary"
                }`}
              >
                <span className="text-lg">{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition"
        >
          <LogOut size={16} /> Выйти
        </button>
      </aside>

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
