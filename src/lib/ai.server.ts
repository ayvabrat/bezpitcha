import { env } from "@/lib/env.server";

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type AiResult = {
  content: string;
};

export async function callLovableAi(messages: AiMessage[]): Promise<AiResult> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0.4,
      messages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI gateway error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI gateway returned empty content");
  }
  return { content };
}
