// Google Places (New) lookups. This module is server-only: never import it from a component.
const PLACES_API = "https://places.googleapis.com";
const GOOGLE_MAP_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "google.com.sa",
  "www.google.com.sa",
  "maps.google.com",
  "maps.google.com.sa",
  "maps.app.goo.gl",
  "goo.gl",
]);

export type DuplicateMatch = {
  kind: "saved_here" | "other_business";
  businessId: string;
  businessName: string;
  reason: "place_id" | "address" | "coordinates";
};

export type PlaceCandidate = {
  placeId: string;
  name: string;
  address: string;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  hours: Record<string, string>;
  rating: number | null;
  businessStatus: string | null;
  duplicateMatches?: DuplicateMatch[];
};

export type PlaceDetails = {
  placeId: string;
  fields: Record<string, string | number>;
  hours: Record<string, string>;
  photoUrl: string | null;
};

type RawPlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  editorialSummary?: { text?: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
  addressComponents?: { longText?: string; types?: string[] }[];
  photos?: { name?: string; widthPx?: number; heightPx?: number }[];
  rating?: number;
  businessStatus?: string;
};

const DAY_KEYS: Record<string, string> = {
  sunday: "sun",
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
};

const SEARCH_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.shortFormattedAddress",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.regularOpeningHours",
  "places.addressComponents",
  "places.rating",
  "places.businessStatus",
].join(",");

const DETAILS_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "shortFormattedAddress",
  "location",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "editorialSummary",
  "regularOpeningHours",
  "addressComponents",
  "photos",
  "rating",
  "businessStatus",
].join(",");

function googleHeaders() {
  // Intentionally no VITE_ fallback: VITE variables are shipped to the browser.
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!mapsKey)
    throw new Error("مفتاح Google Places الخاص بالخادم غير مضبوط (GOOGLE_MAPS_API_KEY).");
  return { "X-Goog-Api-Key": mapsKey, "Content-Type": "application/json" };
}

async function googlePlaces(path: string, init: RequestInit & { fieldMask?: string }) {
  const { fieldMask, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(`${PLACES_API}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { ...googleHeaders(), ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}) },
    });
    const body = await response.text();
    if (!response.ok) {
      let detail = "تعذر الاتصال بخدمة Google Places.";
      try {
        const parsed = JSON.parse(body) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        // Keep the safe generic message when Google does not return JSON.
      }
      if (/referer/i.test(detail)) {
        throw new Error(
          "مفتاح Google الحالي مقيّد للمتصفح ولا يقبل طلبات الخادم. أضف GOOGLE_MAPS_API_KEY مستقلاً ومفعّلاً لخدمة Places API (New).",
        );
      }
      throw new Error(`Google Places [${response.status}]: ${detail}`);
    }
    return body ? JSON.parse(body) : {};
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("انتهت مهلة الاتصال بـ Google Places. حاول مرة أخرى.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedGoogleMapsUrl(url: URL) {
  return url.protocol === "https:" && GOOGLE_MAP_HOSTS.has(url.hostname.toLowerCase());
}

/** Resolve only explicitly allow-listed Google redirect hosts to prevent SSRF. */
export async function resolveGoogleMapsUrl(input: string): Promise<URL> {
  let current: URL;
  try {
    current = new URL(input.trim());
  } catch {
    throw new Error("ألصق رابطاً صالحاً من Google Maps يبدأ بـ https://.");
  }
  if (!isAllowedGoogleMapsUrl(current))
    throw new Error("ألصق رابطاً صالحاً من Google Maps يبدأ بـ https://.");
  for (let hop = 0; hop < 5; hop++) {
    if (!new Set(["maps.app.goo.gl", "goo.gl"]).has(current.hostname.toLowerCase())) return current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "PureTable/1.0" },
      });
      const location = response.headers.get("location");
      if (!location) return current;
      const next = new URL(location, current);
      if (!isAllowedGoogleMapsUrl(next))
        throw new Error("رابط Google Maps أعاد التوجيه إلى نطاق غير مسموح.");
      current = next;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(
    "رابط Google Maps يحتوي على تحويلات كثيرة. استخدم الرابط الكامل من شريط العنوان.",
  );
}

export function parseGoogleMapsUrl(url: URL): { placeId: string | null; query: string | null } {
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const decoded = decode(url.href);
  const placeId =
    url.searchParams.get("query_place_id") ??
    url.searchParams.get("place_id") ??
    decoded.match(/!1s(ChI[A-Za-z0-9_-]+)/)?.[1] ??
    null;
  const queryParam = url.searchParams.get("query") ?? url.searchParams.get("q");
  const pathMatch = decode(url.pathname).match(/\/maps\/place\/([^/]+)/i);
  const query = (queryParam ?? pathMatch?.[1]?.replace(/\+/g, " ") ?? "").trim() || null;
  return { placeId, query };
}

function hoursOf(place: RawPlace) {
  const hours: Record<string, string> = {};
  for (const line of place.regularOpeningHours?.weekdayDescriptions ?? []) {
    const [dayRaw, ...rest] = line.split(":");
    const key = DAY_KEYS[(dayRaw ?? "").trim().toLowerCase()];
    if (key) hours[key] = rest.join(":").trim();
  }
  return hours;
}

function component(place: RawPlace, types: string[]) {
  return (
    place.addressComponents?.find((item) => types.some((type) => item.types?.includes(type)))
      ?.longText ?? null
  );
}

function toCandidate(place: RawPlace): PlaceCandidate {
  return {
    placeId: place.id,
    name: place.displayName?.text ?? "Google Maps place",
    address: place.formattedAddress ?? place.shortFormattedAddress ?? "",
    city: component(place, [
      "locality",
      "administrative_area_level_2",
      "administrative_area_level_1",
    ]),
    district: component(place, ["sublocality_level_1", "sublocality_level_2", "neighborhood"]),
    lat: place.location?.latitude ?? null,
    lng: place.location?.longitude ?? null,
    phone:
      (place.nationalPhoneNumber ?? place.internationalPhoneNumber)?.replace(/\s+/g, "") ?? null,
    website: place.websiteUri ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    hours: hoursOf(place),
    rating: typeof place.rating === "number" ? place.rating : null,
    businessStatus: place.businessStatus ?? null,
  };
}

async function rawPlace(placeId: string, language = "en") {
  if (!/^[A-Za-z0-9_-]{3,300}$/.test(placeId)) throw new Error("معرّف المكان غير صالح.");
  return (await googlePlaces(
    `/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(language)}`,
    {
      method: "GET",
      fieldMask: DETAILS_MASK,
    },
  )) as RawPlace;
}

async function textSearch(textQuery: string, pageSize: number) {
  const json = (await googlePlaces("/v1/places:searchText", {
    method: "POST",
    body: JSON.stringify({ textQuery, languageCode: "en", regionCode: "SA", pageSize }),
    fieldMask: SEARCH_MASK,
  })) as { places?: RawPlace[] };
  return (json.places ?? []).map(toCandidate);
}

/** Search by a business name or a Google Maps link without writing any data. */
export async function searchPlaces(input: string, city?: string | null): Promise<PlaceCandidate[]> {
  const clean = input.trim();
  if (/^https?:\/\//i.test(clean)) {
    const resolved = await resolveGoogleMapsUrl(clean);
    const parsed = parseGoogleMapsUrl(resolved);
    if (parsed.placeId) return [toCandidate(await rawPlace(parsed.placeId))];
    if (!parsed.query)
      throw new Error("لم نستطع قراءة اسم المكان من الرابط. استخدم رابط Google Maps الكامل.");
    return textSearch([parsed.query, city, "Saudi Arabia"].filter(Boolean).join(", "), 20);
  }
  return textSearch([clean, city, "Saudi Arabia"].filter(Boolean).join(", "), 20);
}

async function photoUrl(photoName: string): Promise<string | null> {
  try {
    const json = (await googlePlaces(
      `/v1/${photoName}/media?maxWidthPx=1600&skipHttpRedirect=true`,
      {
        method: "GET",
      },
    )) as { photoUri?: string };
    return json.photoUri ?? null;
  } catch {
    return null;
  }
}

async function pickBestPhoto(photos: RawPlace["photos"]): Promise<string | null> {
  const eligible = (photos ?? [])
    .filter((photo) => photo.name && (photo.widthPx ?? 0) >= 900 && (photo.heightPx ?? 0) >= 600)
    .filter((photo) => {
      const ratio = (photo.widthPx ?? 1) / (photo.heightPx ?? 1);
      return ratio >= 0.9 && ratio <= 2.2;
    })
    .sort((a, b) => (b.widthPx ?? 0) * (b.heightPx ?? 0) - (a.widthPx ?? 0) * (a.heightPx ?? 0));
  return eligible[0]?.name ? photoUrl(eligible[0].name) : null;
}

/** Fetch all auto-fillable fields for one reviewed candidate. */
export async function placeDetails(
  placeId: string,
  _options: { language?: string; category?: string | null } = {},
): Promise<PlaceDetails> {
  const place = await rawPlace(placeId);
  const candidate = toCandidate(place);
  const fields: Record<string, string | number> = {};
  if (candidate.address) fields["address"] = candidate.address;
  if (candidate.city) fields["city"] = candidate.city;
  if (candidate.district) fields["district"] = candidate.district;
  if (candidate.lat != null) fields["lat"] = candidate.lat;
  if (candidate.lng != null) fields["lng"] = candidate.lng;
  if (candidate.phone) fields["phone"] = candidate.phone;
  if (candidate.website) fields["website"] = candidate.website;
  if (candidate.mapsUrl) fields["maps_url"] = candidate.mapsUrl;
  if (place.editorialSummary?.text) fields["description"] = place.editorialSummary.text;
  if (candidate.name) fields["name_from_google"] = candidate.name;
  return { placeId, fields, hours: candidate.hours, photoUrl: await pickBestPhoto(place.photos) };
}

export type PlaceBranch = PlaceCandidate;

/** Find candidate locations for a brand. Results remain read-only until explicit save. */
export async function searchBranches(input: string, city?: string | null): Promise<PlaceBranch[]> {
  let brand = input.trim();
  if (/^https?:\/\//i.test(brand)) {
    const seed = await searchPlaces(brand, city);
    if (!seed[0]) return [];
    brand = seed[0].name;
    city = city || seed[0].city;
  }
  return textSearch([brand, city, "Saudi Arabia"].filter(Boolean).join(", "), 20);
}

/** Re-fetch a selected branch by immutable Place ID at save time. */
export async function placeBranch(placeId: string): Promise<PlaceBranch> {
  return toCandidate(await rawPlace(placeId));
}

/** Arabic name/address metadata for the same Place ID. */
export async function placeArabic(placeId: string): Promise<Record<string, string>> {
  try {
    const place = await rawPlace(placeId, "ar");
    const out: Record<string, string> = {};
    if (place.displayName?.text) out["name_ar"] = place.displayName.text;
    if (place.formattedAddress) out["address_ar"] = place.formattedAddress;
    if (place.editorialSummary?.text) out["description_ar"] = place.editorialSummary.text;
    const city = component(place, [
      "locality",
      "administrative_area_level_2",
      "administrative_area_level_1",
    ]);
    const district = component(place, [
      "sublocality_level_1",
      "sublocality_level_2",
      "neighborhood",
    ]);
    if (city) out["city_ar"] = city;
    if (district) out["district_ar"] = district;
    return out;
  } catch {
    return {};
  }
}

export function distanceMeters(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return null;
  const radians = (value: number) => (value * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function normalizePlaceText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}
