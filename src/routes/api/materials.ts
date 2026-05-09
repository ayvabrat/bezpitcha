import { createFileRoute } from "@tanstack/react-router";
import { listMaterials } from "@/lib/materials.functions";

export const Route = createFileRoute("/api/materials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const page = Number(url.searchParams.get("page") ?? "1");
        const limit = Number(url.searchParams.get("limit") ?? "20");
        const recommendation = url.searchParams.get("recommendation") ?? undefined;
        const source = url.searchParams.get("source") ?? undefined;
        const q = url.searchParams.get("q") ?? undefined;
        const result = await listMaterials({ data: { page, limit, recommendation, source, q } });
        return Response.json(result);
      },
    },
  },
});
