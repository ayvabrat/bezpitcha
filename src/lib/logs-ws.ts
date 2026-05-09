import { supabase } from "@/integrations/supabase/client";

export type LogEntry = {
  time: string;
  level: "info" | "warning" | "error";
  message: string;
};

export type LogsStatus = "connecting" | "open" | "closed";

export interface LogsHandlers {
  onMessage: (l: LogEntry) => void;
  onStatus: (s: LogsStatus) => void;
}

export function connectLogs(h: LogsHandlers): () => void {
  let attempt = 0;
  let closedByUser = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const open = () => {
    h.onStatus("connecting");
    channel = supabase
      .channel("logs_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        (payload: { new?: Record<string, unknown> }) => {
          const row = payload.new;
          if (!row) return;
          h.onMessage({
            time: row.created_at as string,
            level: (row.level as LogEntry["level"]) ?? "info",
            message: String(row.message ?? ""),
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          attempt = 0;
          h.onStatus("open");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          h.onStatus("closed");
          if (!closedByUser) schedule();
        }
      });
  };

  const schedule = () => {
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt++));
    retryTimer = setTimeout(open, delay);
  };

  open();

  return () => {
    closedByUser = true;
    if (retryTimer) clearTimeout(retryTimer);
    channel?.unsubscribe();
  };
}
