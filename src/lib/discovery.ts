import type { Business } from "@/data/businesses";
import { planRank } from "@/lib/plans";
import { normalizeText, searchRelevance } from "@/lib/search";
import { canBook } from "@/lib/services";
import { findCity } from "@/lib/saudi";

export const NEARBY_RADIUS_KM = 10;

export type Coordinates = { lat: number; lng: number };

export type DiscoveryOptions = {
  query?: string;
  categories?: string[];
  premiumOnly?: boolean;
  bookingOnly?: boolean;
  position?: Coordinates | null;
  nearbyOnly?: boolean;
  cityKey?: string | null;
  districtKey?: string | null;
};

export type DiscoveryResult = { business: Business; distance: number | null; relevance: number };

function distanceKm(a: Coordinates, b: Coordinates) {
  const earthRadiusKm = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function hasCategory(business: Business, category: string) {
  const categories = business.categories?.length ? business.categories : [business.category];
  return (categories as string[]).includes(category);
}

function normalizedCity(value: string | null | undefined) {
  return normalizeText(findCity(value)?.en ?? value ?? "");
}

function validPoint(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Coordinates | null {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

export function businessPoints(business: Business): Coordinates[] {
  const points: Coordinates[] = [];
  if (!business.noLocation) {
    const main = validPoint(business.lat, business.lng);
    if (main) points.push(main);
    for (const branch of business.branches ?? []) {
      if (branch.permanentlyClosed) continue;
      const point = validPoint(branch.lat, branch.lng);
      if (point) points.push(point);
    }
  }
  return points;
}

export function nearestBusinessDistance(business: Business, position: Coordinates) {
  let nearest = Number.POSITIVE_INFINITY;
  for (const point of businessPoints(business))
    nearest = Math.min(nearest, distanceKm(position, point));
  return Number.isFinite(nearest) ? nearest : null;
}

function locationKeys(business: Business) {
  const locations = [
    { city: business.city, district: business.district },
    ...(business.branches ?? []).map((branch) => ({
      city: branch.city,
      district: branch.district,
    })),
  ];
  return locations.map((location) => ({
    city: normalizedCity(location.city),
    district: normalizeText(location.district ?? ""),
  }));
}

export function discoverBusinesses(
  items: Business[],
  options: DiscoveryOptions = {},
): DiscoveryResult[] {
  const query = options.query?.trim() ?? "";
  const categories = options.categories ?? [];
  const cityKey = normalizeText(options.cityKey ?? "");
  const districtKey = normalizeText(options.districtKey ?? "");

  return items
    .map((business) => ({
      business,
      relevance: searchRelevance(business, query),
      distance: options.position ? nearestBusinessDistance(business, options.position) : null,
    }))
    .filter(({ business, relevance, distance }) => {
      if (query && relevance < 0) return false;
      if (categories.length && !categories.some((category) => hasCategory(business, category)))
        return false;
      if (options.premiumOnly && business.plan !== "premium") return false;
      if (options.bookingOnly && !canBook(business)) return false;
      if (
        options.nearbyOnly &&
        options.position &&
        (distance == null || distance > NEARBY_RADIUS_KM)
      )
        return false;
      if (cityKey) {
        const locations = locationKeys(business);
        if (
          !locations.some(
            (location) =>
              location.city === cityKey && (!districtKey || location.district === districtKey),
          )
        ) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (a.relevance !== b.relevance) return b.relevance - a.relevance;
      const planDifference = planRank(b.business) - planRank(a.business);
      if (planDifference) return planDifference;
      const distanceDifference =
        (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY);
      if (distanceDifference) return distanceDifference;
      const newest =
        Date.parse(b.business.createdAt ?? "") - Date.parse(a.business.createdAt ?? "");
      if (Number.isFinite(newest) && newest) return newest;
      return a.business.name.localeCompare(b.business.name);
    });
}

export type LocationOption = {
  key: string;
  label: string;
  districts: { key: string; label: string }[];
};

const CORE_LOCATION_CITIES = [
  { en: "Riyadh", ar: "الرياض" },
  { en: "Jeddah", ar: "جدة" },
  { en: "Dammam", ar: "الدمام" },
] as const;

export function buildLocationOptions(items: Business[], lang: "ar" | "en"): LocationOption[] {
  const cities = new Map<string, { label: string; districts: Map<string, string> }>();
  for (const city of CORE_LOCATION_CITIES) {
    cities.set(normalizedCity(city.en), { label: city[lang], districts: new Map() });
  }
  for (const business of items) {
    const locations = [
      {
        city: business.city,
        cityLabel: business.city_i18n?.[lang] || business.city,
        district: business.district,
        districtLabel: business.district_i18n?.[lang] || business.district,
      },
      ...(business.branches ?? []).map((branch) => ({
        city: branch.city,
        cityLabel: branch.city_i18n?.[lang] || branch.city,
        district: branch.district,
        districtLabel: branch.district_i18n?.[lang] || branch.district,
      })),
    ];
    for (const location of locations) {
      const cityKey = normalizedCity(location.city);
      if (!cityKey) continue;
      const city = cities.get(cityKey) ?? {
        label: location.cityLabel || location.city || cityKey,
        districts: new Map(),
      };
      const districtKey = normalizeText(location.district ?? "");
      if (districtKey)
        city.districts.set(districtKey, location.districtLabel || location.district || districtKey);
      cities.set(cityKey, city);
    }
  }
  return [...cities.entries()]
    .map(([key, city]) => ({
      key,
      label: city.label,
      districts: [...city.districts.entries()]
        .map(([districtKey, label]) => ({ key: districtKey, label }))
        .sort((a, b) => a.label.localeCompare(b.label, lang)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}
