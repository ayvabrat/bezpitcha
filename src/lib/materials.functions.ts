import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { callLovableAi } from "@/lib/ai.server";
import { writeLog } from "@/lib/db.server";

const listSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  recommendation: z.string().optional(),
  source: z.string().optional(),
  q: z.string().optional(),
});

export const listMaterials = createServerFn({ method: "GET" })
  .inputValidator(listSchema)
  .handler(async ({ data }) => {
    const from = (data.page - 1) * data.limit;
    const to = from + data.limit - 1;

    let query = supabaseAdmin
      .from("materials")
      .select("*", { count: "exact" })
      .order("parsed_at", { ascending: false })
      .range(from, to);

    if (data.recommendation) query = query.eq("recommendation", data.recommendation);
    if (data.source) query = query.eq("source_name", data.source);
    if (data.q) query = query.ilike("original_text", `%${data.q}%`);

    const { data: items, count, error } = await query;
    if (error) throw new Error(error.message);
    return { items: items ?? [], total: count ?? 0 };
  });

export const analyzeMaterial = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: material, error } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !material) throw new Error("Material not found");

    const ai = await callLovableAi([
      {
        role: "system",
        content:
          "Return only JSON with keys: relevance_score, interest_score, actuality_score, content_type, recommendation, reasoning, platforms.",
      },
      { role: "user", content: material.original_text ?? "" },
    ]);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(ai.content);
    } catch {
      throw new Error("AI returned non-JSON result");
    }

    const payload = {
      relevance_score: Number(parsed.relevance_score ?? 0),
      interest_score: Number(parsed.interest_score ?? 0),
      actuality_score: Number(parsed.actuality_score ?? 0),
      content_type: String(parsed.content_type ?? "новость"),
      recommendation: String(parsed.recommendation ?? "maybe"),
      reasoning: String(parsed.reasoning ?? ""),
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : [],
    };

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("materials")
      .update(payload)
      .eq("id", data.id)
      .select("*")
      .single();
    if (updateError || !updated) throw new Error(updateError?.message ?? "Update failed");

    await writeLog("info", "materials.analyze", `Material analyzed: ${data.id}`);
    return { material: updated };
  });

export const generatePost = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), platform: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: material, error } = await supabaseAdmin
      .from("materials")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !material) throw new Error("Material not found");

    const ai = await callLovableAi([
      {
        role: "system",
        content: "Create a social media post in markdown and return JSON with keys: title, content.",
      },
      {
        role: "user",
        content: `Platform: ${data.platform}\nSource: ${material.source_name}\nText:\n${material.original_text ?? ""}`,
      },
    ]);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(ai.content);
    } catch {
      parsed = { title: `Пост для ${data.platform}`, content: ai.content };
    }
    await writeLog("info", "materials.generate", `Generated post for ${data.id}`, {
      platform: data.platform,
    });
    return {
      title: String(parsed.title ?? `Пост для ${data.platform}`),
      platform: data.platform,
      content: String(parsed.content ?? ""),
    };
  });
