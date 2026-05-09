import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function writeLog(
  level: "info" | "warning" | "error",
  source: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  await supabaseAdmin.from("logs").insert({
    level,
    source,
    message,
    meta: meta ?? {},
  });
}

export async function requireSessionSecretHeader(request: Request): Promise<boolean> {
  const secret = request.headers.get("x-cron-secret");
  return !!secret && secret === process.env.CRON_SECRET;
}
