import { createFileRoute } from "@tanstack/react-router";

// Covers live in a private bucket; this endpoint issues a short-lived signed
// URL on demand and redirects to it so <img src> works everywhere.
export const Route = createFileRoute("/api/public/cover/$path")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = decodeURIComponent(params.path);
        if (!path || path.includes("..") || path.startsWith("/")) {
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
