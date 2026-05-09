import { createFileRoute } from "@tanstack/react-router";
import { generatePost } from "@/lib/materials.functions";

export const Route = createFileRoute("/api/materials/$id/generate")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        const body = (await request.json()) as { platform?: string };
        const result = await generatePost({ data: { id: params.id, platform: body.platform ?? "telegram" } });
        return Response.json(result);
      },
    },
  },
});
