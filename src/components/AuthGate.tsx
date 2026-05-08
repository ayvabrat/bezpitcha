import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSession } from "@/lib/supabase-auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
