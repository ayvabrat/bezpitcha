import { createServerFn } from "@tanstack/react-start";
import { callLovableAi } from "@/lib/ai.server";
import { writeLog } from "@/lib/db.server";

export const suggestTopics = createServerFn({ method: "POST" }).handler(async () => {
  const ai = await callLovableAi([
    {
      role: "system",
      content: "Return only JSON: {\"topics\": string[]} with 8 concise Russian social media topics.",
    },
    {
      role: "user",
      content: "Generate fresh topical ideas for BezPitcha audience.",
    },
  ]);
  let topics: string[] = [];
  try {
    const parsed = JSON.parse(ai.content) as { topics?: string[] };
    topics = Array.isArray(parsed.topics) ? parsed.topics : [];
  } catch {
    topics = ai.content
      .split("\n")
      .map((x) => x.replace(/^\s*[-*0-9.)]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 8);
  }
  await writeLog("info", "topics.suggest", `Generated ${topics.length} topics`);
  return { topics };
});
