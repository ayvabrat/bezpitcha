import { createFileRoute } from "@tanstack/react-router";
import { analyzeMaterial } from "@/lib/materials.functions";

export const Route = createFileRoute("/api/materials/$id/analyze")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        const result = await analyzeMaterial({ data: { id: params.id } });
        return Response.json(result);
      },
    },
  },
});
