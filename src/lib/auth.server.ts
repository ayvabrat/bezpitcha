import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireAuth(request: Request): Promise<Record<string, unknown>> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Response("Unauthorized: Bearer token required", { status: 401 });
  }
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getClaims(token);
  if (error || !data?.claims) {
    throw new Response("Unauthorized: Invalid token", { status: 401 });
  }
  return data.claims;
}
