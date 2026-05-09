import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const listQueue = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("task_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return { items: data ?? [] };
});

export const enqueueTask = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      kind: z.string().min(1),
      payload: z.record(z.any()).default({}),
    }),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("task_queue")
      .insert({
        kind: data.kind,
        payload: data.payload,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
