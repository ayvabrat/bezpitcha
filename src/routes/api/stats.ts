import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAuth } from "@/lib/auth.server";

export const Route = createFileRoute("/api/stats")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        await requireAuth(request);
        const [materialsCount, queueCount, todayCount, weekCount, rejectedCount] = await Promise.all([
          supabaseAdmin.from("materials").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("task_queue").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabaseAdmin
            .from("materials")
            .select("*", { count: "exact", head: true })
            .gte("published_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
          supabaseAdmin
            .from("materials")
            .select("*", { count: "exact", head: true })
            .gte("published_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
          supabaseAdmin.from("materials").select("*", { count: "exact", head: true }).eq("recommendation", "skip"),
        ]);

        return Response.json({
          parsed_total: materialsCount.count ?? 0,
          queue_count: queueCount.count ?? 0,
          published_today: todayCount.count ?? 0,
          published_week: weekCount.count ?? 0,
          rejected_total: rejectedCount.count ?? 0,
        });
      },
    },
  },
});
