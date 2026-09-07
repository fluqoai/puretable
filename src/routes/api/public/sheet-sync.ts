import { createFileRoute } from "@tanstack/react-router";

/**
 * Hourly auto sync of the saved Google Sheet.
 * Called by a standard scheduler (Vercel Cron in production) with CRON_SECRET.
 */
export const Route = createFileRoute("/api/public/sheet-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["CRON_SECRET"];
        const provided = request.headers.get("authorization");
        if (!expected || provided !== `Bearer ${expected}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          applyPlan,
          buildPlan,
          fetchSheetMatrix,
          readSheetSync,
          rowsToObjects,
          summarize,
          writeSheetSync,
        } = await import("@/lib/import.server");

        const cfg = await readSheetSync(supabaseAdmin);
        if (!cfg.sheet || !cfg.auto) {
          return Response.json({ skipped: true, reason: "Auto sync is off" });
        }
        try {
          const matrix = await fetchSheetMatrix(cfg.sheet, cfg.tab || undefined);
          const { plan } = await buildPlan(supabaseAdmin, rowsToObjects(matrix));
          // Only fully-resolved rows are written automatically; anything ambiguous
          // waits for the admin in the import screen.
          const results = await applyPlan(
            supabaseAdmin,
            plan.filter((p) => p.action === "create" || p.action === "update"),
          );
          await writeSheetSync(supabaseAdmin, { ...cfg, lastRun: new Date().toISOString() });
          return Response.json({ ok: true, summary: summarize(plan), imported: results.filter((r) => r.ok).length });
        } catch (error) {
          console.error("[sheet-sync]", error);
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Sync failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
