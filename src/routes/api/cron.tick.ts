import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSessionSecretHeader, writeLog } from "@/lib/db.server";

const MAX_ATTEMPTS = 5;

function backoffSeconds(attempts: number): number {
  return Math.min(3600, 2 ** attempts * 30);
}

export const Route = createFileRoute("/api/cron/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorized = await requireSessionSecretHeader(request);
        if (!authorized) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const { data: tasks, error } = await supabaseAdmin
          .from("task_queue")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(5);

        if (error) return Response.json({ error: error.message }, { status: 500 });

        let done = 0;
        let failed = 0;
        for (const task of tasks ?? []) {
          try {
            await writeLog("info", "cron.tick", `Processing task ${task.id}`, { kind: task.kind });
            await supabaseAdmin
              .from("task_queue")
              .update({ status: "done", updated_at: new Date().toISOString() })
              .eq("id", task.id);
            done++;
          } catch (e) {
            const attempts = Number(task.attempts ?? 0) + 1;
            const terminal = attempts >= MAX_ATTEMPTS;
            await supabaseAdmin
              .from("task_queue")
              .update({
                attempts,
                status: terminal ? "failed" : "pending",
                last_error: (e as Error).message,
                updated_at: new Date(Date.now() + backoffSeconds(attempts) * 1000).toISOString(),
              })
              .eq("id", task.id);
            failed++;
          }
        }
        return Response.json({ ok: true, processed: (tasks ?? []).length, done, failed });
      },
    },
  },
});
