import { z } from "zod";
import { PLAN_FEATURES, PLAN_TIERS, type PlanFeatures, type PlanTier } from "./plans";

export const PlanDefinition = z.object({
  id: z.enum(["free", "pro", "premium"]),
  branch_limit: z.number().int().min(1).max(1000).nullable(),
  photo_limit: z.number().int().min(1).max(100),
  description_limit: z.number().int().min(20).max(10000).nullable(),
  show_links: z.boolean(),
  analytics: z.enum(["none", "basic", "full"]),
  revision: z.number().int().positive(),
});
export type PlanDefinition = z.infer<typeof PlanDefinition>;
export type PlanCatalog = Record<PlanTier, PlanDefinition>;

export function toFeatures(definition: PlanDefinition): PlanFeatures {
  return {
    ...PLAN_FEATURES[definition.id],
    branchLimit: definition.branch_limit,
    photoLimit: definition.photo_limit,
    descriptionLimit: definition.description_limit,
    showLinks: definition.show_links,
    analytics: definition.analytics,
  };
}

export function parsePlanCatalog(rows: unknown): PlanCatalog {
  const definitions = z.array(PlanDefinition).parse(rows);
  if (PLAN_TIERS.some((id) => !definitions.some((plan) => plan.id === id))) {
    throw new Error("تعذر تحميل تعريفات الباقات الثلاث. أعد المحاولة.");
  }
  return Object.fromEntries(definitions.map((plan) => [plan.id, plan])) as PlanCatalog;
}

export function planSummary(features: PlanFeatures) {
  return `الفروع: ${features.branchLimit ?? "غير محدودة"} · الصور: ${features.photoLimit} · روابط التواصل: ${features.showLinks ? "متاحة" : "غير متاحة"} · التحليلات: ${{ none: "غير متاحة", basic: "أساسية", full: "كاملة" }[features.analytics]}`;
}
