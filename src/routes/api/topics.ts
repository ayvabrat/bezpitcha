import { createFileRoute } from "@tanstack/react-router";
import { suggestTopics } from "@/lib/topics.functions";

export const Route = createFileRoute("/api/topics")({
  server: {
    handlers: {
      POST: async () => Response.json(await suggestTopics()),
    },
  },
});
