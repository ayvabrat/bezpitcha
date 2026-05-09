import { createFileRoute } from "@tanstack/react-router";
import { getWatermarkSettings } from "@/lib/watermark.functions";

export const Route = createFileRoute("/api/watermark")({
  server: {
    handlers: {
      GET: async () => Response.json(await getWatermarkSettings()),
    },
  },
});
