import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getWatermarkSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("watermark_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    image_url: data?.image_path ?? data?.file_path ?? null,
    opacity: data?.opacity ?? 0.5,
  };
});

export const setWatermarkOpacity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ opacity: z.number().min(0).max(1) }))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("watermark_settings").upsert({
      id: crypto.randomUUID(),
      opacity: data.opacity,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
