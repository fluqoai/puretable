import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/businesses.server";
import {
  applyPlan,
  attachCoversByFilename,
  buildPlan,
  fetchSheetMatrix,
  parseDelimited,
  readSheetSync,
  rowsToObjects,
  summarize,
  writeSheetSync,
  type RowPlan,
} from "@/lib/import.server";

export const previewCsvImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => z.object({ text: z.string().min(1).max(2_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = rowsToObjects(parseDelimited(data.text));
    return buildPlan(context.supabase, rows);
  });

export const previewSheetImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sheet: string; tab?: string }) =>
    z.object({ sheet: z.string().min(5).max(500), tab: z.string().max(120).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const matrix = await fetchSheetMatrix(data.sheet, data.tab);
    return buildPlan(context.supabase, rowsToObjects(matrix));
  });

export const commitImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan: RowPlan[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return applyPlan(
      context.supabase,
      data.plan.filter((p) => p.action === "create" || p.action === "update"),
    );
  });

// Revalidate the uploaded data without external place lookups.
export const retryImportRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { row: RowPlan }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { enrichRow } = await import("@/lib/import.server");
    const row: RowPlan = {
      ...data.row,
      fields: { ...data.row.fields },
      errors: [],
      missing: [],
      status: "ready",
      action: data.row.matchedId ? "update" : "create",
    };
    return enrichRow(row);
  });

export const attachBulkCovers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { items: { filename: string; readUrl: string }[] }) =>
    z
      .object({
        items: z
          .array(z.object({ filename: z.string().min(1).max(300), readUrl: z.string().min(1).max(600) }))
          .max(300),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return attachCoversByFilename(context.supabase, data.items);
  });

// -------- Auto sync --------

export const getSheetSync = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return readSheetSync(context.supabase);
  });

export const saveSheetSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sheet: string; tab: string; auto: boolean }) =>
    z.object({ sheet: z.string().max(500), tab: z.string().max(120), auto: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const current = await readSheetSync(context.supabase);
    return writeSheetSync(context.supabase, { ...current, ...data });
  });

/** One-click sync: read the saved sheet, import every ready row, report the rest. */
export const syncSheetNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const cfg = await readSheetSync(context.supabase);
    if (!cfg.sheet) throw new Error("Save a Google Sheet link first.");
    const matrix = await fetchSheetMatrix(cfg.sheet, cfg.tab || undefined);
    const { plan } = await buildPlan(context.supabase, rowsToObjects(matrix));
    const results = await applyPlan(
      context.supabase,
      plan.filter((p) => p.action === "create" || p.action === "update"),
    );
    const pending = plan.filter((p) => p.action === "skip" || p.action === "choose");
    await writeSheetSync(context.supabase, { ...cfg, lastRun: new Date().toISOString() });
    return { results, pending, summary: summarize(plan) };
  });
