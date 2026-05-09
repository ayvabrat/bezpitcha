import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/watermark/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "file is required" }, { status: 400 });
        }

        const objectPath = `global/watermark-${Date.now()}-${file.name}`;
        const bytes = await file.arrayBuffer();
        const { error } = await supabaseAdmin.storage
          .from("watermarks")
          .upload(objectPath, bytes, { contentType: file.type || "application/octet-stream", upsert: true });
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        await supabaseAdmin.from("watermark_settings").upsert({
          id: crypto.randomUUID(),
          image_path: objectPath,
          file_path: objectPath,
          updated_at: new Date().toISOString(),
        });

        return Response.json({ ok: true, path: objectPath });
      },
    },
  },
});
