import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate({ to: "/" });
    } else {
      setReady(true);
    }
  }, [navigate]);
  if (!ready) return null;
  return <>{children}</>;
}
