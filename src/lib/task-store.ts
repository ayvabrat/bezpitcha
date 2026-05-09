// Per-material task tracker (analyze/generate). Persisted to localStorage so UX
// is idempotent across page reloads. Each task is keyed by `${kind}:${id}`.

import { useEffect, useState } from "react";

export type TaskKind = "analyze" | "generate";
export type TaskState = "queued" | "running" | "done" | "failed";

export interface TaskRecord {
  id: string;             // material id
  kind: TaskKind;
  state: TaskState;
  startedAt: number;
  finishedAt?: number;
  message?: string;
  platform?: string;
}

const KEY = "bezpitcha_tasks";
const listeners = new Set<() => void>();

function load(): Record<string, TaskRecord> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function save(map: Record<string, TaskRecord>) {
  localStorage.setItem(KEY, JSON.stringify(map));
  listeners.forEach((l) => l());
}
function k(kind: TaskKind, id: string) { return `${kind}:${id}`; }

export const taskStore = {
  get(kind: TaskKind, id: string): TaskRecord | undefined {
    return load()[k(kind, id)];
  },
  isRunning(kind: TaskKind, id: string): boolean {
    const t = load()[k(kind, id)];
    return !!t && (t.state === "queued" || t.state === "running");
  },
  start(kind: TaskKind, id: string, extra?: Partial<TaskRecord>) {
    const map = load();
    map[k(kind, id)] = { id, kind, state: "running", startedAt: Date.now(), ...extra };
    save(map);
  },
  finish(kind: TaskKind, id: string, ok: boolean, message?: string) {
    const map = load();
    const cur = map[k(kind, id)];
    if (!cur) return;
    map[k(kind, id)] = {
      ...cur,
      state: ok ? "done" : "failed",
      finishedAt: Date.now(),
      message,
    };
    save(map);
  },
  clear(kind: TaskKind, id: string) {
    const map = load();
    delete map[k(kind, id)];
    save(map);
  },
  cleanupStale(maxAgeMs = 60 * 60 * 1000) {
    const map = load();
    const now = Date.now();
    let changed = false;
    for (const key of Object.keys(map)) {
      const t = map[key];
      // re-mark long-running orphans as failed (page was reloaded mid-task)
      if (t.state === "running" && now - t.startedAt > 5 * 60 * 1000) {
        map[key] = { ...t, state: "failed", finishedAt: now, message: "Прервано (перезагрузка)" };
        changed = true;
      }
      // gc done/failed older than maxAge
      if ((t.state === "done" || t.state === "failed") && t.finishedAt && now - t.finishedAt > maxAgeMs) {
        delete map[key]; changed = true;
      }
    }
    if (changed) save(map);
  },
};

export function useTask(kind: TaskKind, id: string): TaskRecord | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    const cb = () => force((n) => n + 1);
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);
  return taskStore.get(kind, id);
}

// Cleanup once on import
if (typeof window !== "undefined") {
  setTimeout(() => taskStore.cleanupStale(), 100);
}
