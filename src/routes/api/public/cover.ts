import { createFileRoute } from "@tanstack/react-router";

// File extensions in a path parameter can be interpreted as route suffixes by
// some production adapters. Passing the object key in the query string keeps
// JPEG, PNG and WebP names intact across local development and Vercel.
export const Route = createFileRoute("/api/public/cover")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path")?.trim() ?? "";
        if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) {
          return new Response("Bad request", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("business-covers").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(data, {
          status: 200,
          headers: {
            "Content-Type": data.type || "application/octet-stream",
            "Cache-Control": "public, max-age=1800",
          },
        });
      },
    },
  },
});
