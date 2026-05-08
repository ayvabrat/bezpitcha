import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAuthed } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthed()) {
      navigate({ to: "/" });
    } else {
      setReady(true);
    }
  }, [navigate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return <>{children}</>;
}
