import { createFileRoute } from "@tanstack/react-router";
import { scanChannel } from "@/lib/channels.functions";

export const Route = createFileRoute("/api/channels/scan")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { username?: string };
        const result = await scanChannel({ data: { username: body.username ?? "" } });
        return Response.json(result);
      },
    },
  },
});
