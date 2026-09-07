import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/businesses.server";
import { namesLookAlike } from "@/lib/import.server";
import {
  distanceMeters,
  normalizePlaceText,
  placeArabic,
  placeBranch,
  placeDetails,
  searchBranches,
  searchPlaces,
  type DuplicateMatch,
  type PlaceCandidate,
} from "@/lib/places.server";
import { branchLimitLabel, planOf, remainingBranchSlots } from "@/lib/plans";

type DuplicateBusiness = {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
};
type DuplicateBranch = {
  business_id: string;
  place_id: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
};

async function withDuplicateMatches(
  supabase: Parameters<typeof assertAdmin>[0],
  candidates: PlaceCandidate[],
  currentBusinessId?: string,
) {
  const [{ data: businesses, error: businessError }, { data: branches, error: branchError }] =
    await Promise.all([
      supabase.from("businesses").select("id, name, address, lat, lng"),
      supabase.from("business_branches").select("business_id, place_id, address, lat, lng"),
    ]);
  if (businessError) throw new Error(businessError.message);
  if (branchError) throw new Error(branchError.message);
  const rows = (businesses ?? []) as DuplicateBusiness[];
  const branchRows = (branches ?? []) as DuplicateBranch[];
  const names = new Map(rows.map((row) => [row.id, row.name]));

  return candidates.map((candidate) => {
    const found = new Map<string, DuplicateMatch>();
    for (const branch of branchRows) {
      const samePlace = !!branch.place_id && branch.place_id === candidate.placeId;
      const sameAddress =
        !!candidate.address &&
        normalizePlaceText(branch.address) === normalizePlaceText(candidate.address);
      const nearby = distanceMeters(candidate, branch);
      if (!samePlace && !sameAddress && (nearby == null || nearby > 60)) continue;
      const reason = samePlace ? "place_id" : sameAddress ? "address" : "coordinates";
      found.set(branch.business_id, {
        kind: branch.business_id === currentBusinessId ? "saved_here" : "other_business",
        businessId: branch.business_id,
        businessName: names.get(branch.business_id) ?? "نشاط محفوظ",
        reason,
      });
    }
    for (const business of rows) {
      if (!namesLookAlike(candidate.name, business.name)) continue;
      const sameAddress =
        !!candidate.address &&
        normalizePlaceText(business.address) === normalizePlaceText(candidate.address);
      const nearby = distanceMeters(candidate, business);
      if (!sameAddress && (nearby == null || nearby > 60)) continue;
      found.set(business.id, {
        kind: business.id === currentBusinessId ? "saved_here" : "other_business",
        businessId: business.id,
        businessName: business.name,
        reason: sameAddress ? "address" : "coordinates",
      });
    }
    return { ...candidate, duplicateMatches: [...found.values()] };
  });
}

/** Search Google Maps by business name or Maps URL. This is read-only. */
export const findPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; city?: string; currentBusinessId?: string }) =>
    z
      .object({
        query: z.string().min(2).max(2000),
        city: z.string().max(120).optional(),
        currentBusinessId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const candidates = await searchPlaces(data.query, data.city ?? null);
    return withDuplicateMatches(context.supabase, candidates, data.currentBusinessId);
  });

/** Pull every auto-fillable field for one place (incl. Arabic + cover photo). */
export const autofillPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string; slug?: string }) =>
    z
      .object({ placeId: z.string().min(3).max(300), slug: z.string().max(200).optional() })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [details, arabic] = await Promise.all([
      placeDetails(data.placeId),
      placeArabic(data.placeId),
    ]);
    // Use Google's best (highest-resolution) photo as a starting cover; an admin
    // can always replace it with the official logo from the businesses list.
    return { fields: details.fields, arabic, hours: details.hours, coverUrl: details.photoUrl };
  });

/** List every Google Maps location of a brand, without saving anything yet. */
export const findBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; city?: string; businessId: string }) =>
    z
      .object({
        query: z.string().min(2).max(2000),
        city: z.string().max(120).optional(),
        businessId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const found = await searchBranches(data.query, data.city ?? null);
    const referenceName = /^https?:\/\//i.test(data.query) ? found[0]?.name : data.query;
    const plausible = referenceName
      ? found.filter((place) => namesLookAlike(referenceName, place.name))
      : found;
    return withDuplicateMatches(context.supabase, plausible, data.businessId);
  });

/** Save only the exact Place IDs selected in the preview. No search result is written implicitly. */

export const importBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { businessId: string; placeIds: string[] }) =>
    z
      .object({
        businessId: z.string().uuid(),
        placeIds: z
          .array(z.string().regex(/^[A-Za-z0-9_-]{3,300}$/))
          .min(1)
          .max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const placeIds = [...new Set(data.placeIds)];
    const found = await Promise.all(placeIds.map((placeId) => placeBranch(placeId)));

    const { data: business, error: businessError } = await context.supabase
      .from("businesses")
      .select("id, plan")
      .eq("id", data.businessId)
      .single();
    if (businessError) throw new Error(businessError.message);

    const { data: current, error: currentError } = await context.supabase
      .from("business_branches")
      .select("id, place_id, name, address, lat, lng, published")
      .eq("business_id", data.businessId);
    if (currentError) throw new Error(currentError.message);
    const existing = current ?? [];

    const { data: globalPlaces, error: globalError } = await context.supabase
      .from("business_branches")
      .select("business_id, place_id")
      .in("place_id", placeIds)
      .neq("business_id", data.businessId);
    if (globalError) throw new Error(globalError.message);
    const ownedElsewhere = new Set(
      (globalPlaces ?? []).map((branch) => branch.place_id).filter(Boolean),
    );

    const accepted: typeof found = [];
    for (const p of found) {
      if (p.businessStatus === "CLOSED_PERMANENTLY") continue;
      if (ownedElsewhere.has(p.placeId)) continue;
      const existingDupe = existing.some(
        (b) =>
          (b.place_id && p.placeId && b.place_id === p.placeId) ||
          (b.address &&
            p.address &&
            b.address.trim().toLowerCase() === p.address.trim().toLowerCase()) ||
          (b.lat != null &&
            b.lng != null &&
            p.lat != null &&
            p.lng != null &&
            Math.abs(b.lat - p.lat) < 0.0004 &&
            Math.abs(b.lng - p.lng) < 0.0004),
      );
      const pendingDupe = accepted.some(
        (candidate) =>
          (candidate.placeId && p.placeId && candidate.placeId === p.placeId) ||
          (candidate.address &&
            p.address &&
            candidate.address.trim().toLowerCase() === p.address.trim().toLowerCase()) ||
          (candidate.lat != null &&
            candidate.lng != null &&
            p.lat != null &&
            p.lng != null &&
            Math.abs(candidate.lat - p.lat) < 0.0004 &&
            Math.abs(candidate.lng - p.lng) < 0.0004),
      );
      if (!existingDupe && !pendingDupe) accepted.push(p);
    }

    const plan = planOf(business);
    const publishedCount = existing.filter((branch) => branch.published).length;
    const remaining = remainingBranchSlots(plan, publishedCount);
    if (remaining !== null && accepted.length > remaining) {
      throw new Error(
        `الباقة ${plan.toUpperCase()} تسمح بإظهار ${branchLimitLabel(plan)} فروع كحد أقصى. ` +
          `المتاح الآن ${remaining}، فاختر هذا العدد فقط أو ارفع الباقة قبل الحفظ.`,
      );
    }

    if (accepted.length === 0) return { imported: 0, skipped: found.length };

    const payload = accepted.map((p, i) => ({
      business_id: data.businessId,
      place_id: p.placeId,
      name: p.name,
      address: p.address,
      city: p.city,
      lat: p.lat,
      lng: p.lng,
      maps_url: p.mapsUrl,
      phone: p.phone,
      hours: p.hours,
      sort_order: existing.length + i,
      published: true,
      plan_limited: false,
    }));
    const { error } = await context.supabase.from("business_branches").insert(payload as never);
    if (error) throw new Error(error.message);

    const imported = accepted.length;
    const skipped = found.length - accepted.length;
    // A business with real branches always has a location, so make sure the
    // "no physical location" flag can't keep the map hidden.
    if (imported > 0) {
      await context.supabase
        .from("businesses")
        .update({ no_location: false } as never)
        .eq("id", data.businessId);
    }
    return { imported, skipped };
  });
