import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { writeLog } from "@/lib/db.server";

export const listChannels = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("channels")
    .select("*")
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const scanChannel = createServerFn({ method: "POST" })
  .inputValidator(z.object({ username: z.string().min(2) }))
  .handler(async ({ data }) => {
    const handle = data.username.startsWith("@") ? data.username : `@${data.username}`;
    await supabaseAdmin.from("channels").upsert({
      handle,
      title: handle,
      is_active: true,
      last_scanned_at: new Date().toISOString(),
    });
    await writeLog("info", "channels.scan", `Scan queued for ${handle}`);
    await supabaseAdmin.from("task_queue").insert({
      kind: "scan_channel",
      payload: { username: handle },
      status: "pending",
    });
    return { success: true, message: `Канал ${handle} добавлен в очередь сканирования` };
  });
