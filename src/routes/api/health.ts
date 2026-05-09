import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const startedAt = performance.now();
        const { error } = await supabaseAdmin.from("materials").select("id").limit(1);
        const dbLatency = Math.round(performance.now() - startedAt);

        if (error) {
          return Response.json(
            { status: "down", db_ok: false, db_latency_ms: dbLatency, db_error: error.message },
            { status: 503 },
          );
        }
        return Response.json({ status: "ok", db_ok: true, db_latency_ms: dbLatency });
      },
    },
  },
});
