import { API_BASE_URL } from "./api-client";
import { getAccessToken } from "./supabase-auth";

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
  let ws: WebSocket | null = null;
  let attempt = 0;
  let closedByUser = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const open = async () => {
    h.onStatus("connecting");
    const token = await getAccessToken();
    const wsBase = API_BASE_URL.replace(/^http/i, "ws");
    const url = `${wsBase}/api/logs${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    try {
      ws = new WebSocket(url);
    } catch {
      schedule();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      h.onStatus("open");
    };
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data && data.message) h.onMessage(data as LogEntry);
      } catch {
        h.onMessage({ time: new Date().toISOString(), level: "info", message: String(ev.data) });
      }
    };
    ws.onerror = () => { /* surfaced via close */ };
    ws.onclose = () => {
      h.onStatus("closed");
      if (!closedByUser) schedule();
    };
  };

  const schedule = () => {
    const delay = Math.min(30000, 1000 * Math.pow(2, attempt++));
    retryTimer = setTimeout(open, delay);
  };

  open();

  return () => {
    closedByUser = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
