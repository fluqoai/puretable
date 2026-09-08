import { readPlanCatalog } from "./subscriptions.server";
import { toFeatures } from "./subscriptions";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RANGES, sinceFor, type RangeKey } from "@/lib/analytics.ranges";
import type { DashboardData } from "@/lib/analytics.dashboard.types";
import { planOf } from "@/lib/plans";

/**
 * All numbers are aggregated inside Postgres (`public.admin_dashboard`) so the
 * server never loads the raw event rows into memory. The definitions and the
 * returned shape are identical to the previous in-memory version, so the
 * dashboard UI and the Excel export keep working unchanged.
 */
export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { range?: RangeKey } | undefined) =>
    z.object({ range: z.enum(RANGES).default("30d") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<DashboardData> => {
    const { data: agg, error } = await context.supabase.rpc("admin_dashboard", {
      _since: sinceFor(data.range) as string,
    });
    if (error) throw new Error(error.message);
    return { range: data.range, ...(agg as unknown as Omit<DashboardData, "range">) };
  });

/**
 * Per-business performance (impressions, views, clicks) — admin only.
 *
 * What is returned depends on the manually set package:
 *   free            → no analytics
 *   pro             → basic totals + timeseries
 *   premium         → the same plus the previous period for comparison
 *
 * The previous period is derived from the same `business_report` aggregate by
 * asking for twice the range and subtracting the current one, so no extra
 * database object is needed.
 */
type BusinessReport = {
  impressions: number;
  views: number;
  maps: number;
  delivery: number;
  booking: number;
  whatsapp: number;
  website: number;
  phone: number;
  social: number;
  contactClicks: number;
  favorites: number;
  timeseries: { date: string; views: number; clicks: number }[];
};

const REPORT_KEYS = [
  "impressions",
  "views",
  "maps",
  "delivery",
  "booking",
  "whatsapp",
  "website",
  "phone",
  "social",
  "contactClicks",
  "favorites",
] as const;

function doubledSince(range: RangeKey): string | null {
  const since = sinceFor(range);
  if (!since) return null;
  const start = new Date(since).getTime();
  return new Date(start - (Date.now() - start)).toISOString();
}

export const getBusinessReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; range?: RangeKey }) =>
    z.object({ businessId: z.string().uuid(), range: z.enum(RANGES).default("30d") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error: planError } = await context.supabase
      .from("businesses")
      .select("plan")
      .eq("id", data.businessId)
      .maybeSingle();
    if (planError) throw new Error(planError.message);
    const catalog = await readPlanCatalog(context.supabase);
    const level = toFeatures(catalog[planOf(row)]).analytics;
    if (level === "none") {
      return {
        level,
        plan: planOf(row as { plan?: string | null } | null),
        report: null,
        previous: null,
      };
    }

    const read = async (since: string | null) => {
      const { data: report, error } = await context.supabase.rpc("business_report", {
        _business_id: data.businessId,
        _since: since as string,
      });
      if (error) throw new Error(error.message);
      return report as unknown as BusinessReport;
    };

    const report = await read(sinceFor(data.range));
    let previous: Partial<BusinessReport> | null = null;
    if (level === "full") {
      const doubled = doubledSince(data.range);
      if (doubled) {
        const both = await read(doubled);
        previous = Object.fromEntries(
          REPORT_KEYS.map((k) => [k, Math.max(0, (both[k] ?? 0) - (report[k] ?? 0))]),
        ) as Partial<BusinessReport>;
      }
    }
    return { level, plan: planOf(row as { plan?: string | null } | null), report, previous };
  });
