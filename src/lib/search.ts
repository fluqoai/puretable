/**
 * Free-text search over every field of a business, with a small
 * Arabic ⇄ English synonym table so "بيتزا" also matches "Pizza".
 */
import type { Business } from "@/data/businesses";

/** Strip Arabic diacritics / tatweel and fold alef, ya and ta-marbuta. */
export function normalizeText(v: string) {
  return v
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words that should find each other, in both languages. */
const SYNONYMS: string[][] = [
  ["pizza", "بيتزا"],
  ["burger", "برجر", "برغر", "همبرجر"],
  ["pasta", "باستا", "مكرونه", "معكرونه"],
  ["bread", "خبز", "عيش"],
  ["cake", "كيك", "كيكه", "تورته"],
  ["dessert", "حلا", "حلى", "حلويات", "حلويات"],
  ["cookie", "كوكيز", "بسكوت"],
  ["donut", "دونات"],
  ["coffee", "قهوه", "كوفي", "كافيه"],
  ["breakfast", "فطور", "افطار"],
  ["sushi", "سوشي"],
  ["chicken", "دجاج", "فراخ"],
  ["meat", "لحم", "لحوم"],
  ["sandwich", "ساندويتش", "سندويش"],
  ["croissant", "كرواسون"],
  ["pancake", "بان كيك", "بانكيك"],
  ["waffle", "وافل"],
  ["ice cream", "ايس كريم", "بوظه"],
  ["juice", "عصير"],
  ["gluten free", "خالي من الجلوتين", "جلوتين", "قلوتين"],
  ["restaurant", "مطعم", "مطاعم"],
  ["cafe", "مقهى", "مقاهي", "كافيه"],
  ["bakery", "مخبز", "مخابز", "فرن"],
  ["home", "اسره منتجه", "اسر منتجه", "منزلي"],
  ["supermarket", "سوبرماركت", "بقاله", "تموينات"],
  ["riyadh", "الرياض"],
  ["jeddah", "جده"],
  ["dammam", "الدمام"],
  ["khobar", "الخبر"],
];

const SYNONYM_INDEX = (() => {
  const map = new Map<string, string[]>();
  for (const group of SYNONYMS) {
    const normalized = group.map(normalizeText);
    for (const word of normalized) {
      map.set(word, Array.from(new Set([...(map.get(word) ?? []), ...normalized])));
    }
  }
  return map;
})();

/** Everything about a business, as one searchable string. */
export function businessHaystack(b: Business) {
  return normalizeText(
    [
      b.name,
      b.name_i18n?.ar,
      b.name_i18n?.en,
      b.city,
      b.city_i18n?.ar,
      b.city_i18n?.en,
      b.district,
      b.district_i18n?.ar,
      b.district_i18n?.en,
      b.region,
      ...(b.cities ?? []),
      b.products,
      b.products_i18n?.ar,
      b.products_i18n?.en,
      b.description,
      b.description_i18n?.ar,
      b.description_i18n?.en,
      b.address,
      b.address_i18n?.ar,
      b.address_i18n?.en,
      b.category,
      ...(b.categories ?? []),
      b.instagram,
      b.website,
      ...b.links.map((l) => `${l.platform} ${l.label ?? ""} ${l.product_name ?? ""}`),
      ...b.branches.map(
        (br) =>
          `${br.name} ${br.name_i18n?.ar ?? ""} ${br.city ?? ""} ${br.district ?? ""} ${br.address ?? ""} ` +
          (br.links ?? []).map((l) => `${l.platform} ${l.product_name ?? ""}`).join(" "),
      ),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/** Every typed word (or one of its synonyms) must appear. */
export function matchesQuery(b: Business, query: string) {
  const hay = businessHaystack(b);
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  return words.every((w) => {
    const variants = SYNONYM_INDEX.get(w) ?? [w];
    return variants.some((v) => hay.includes(v));
  });
}

/** A stable relevance score used before subscription, distance and recency. */
export function searchRelevance(b: Business, query: string) {
  const normalized = normalizeText(query);
  if (!normalized) return 0;
  if (!matchesQuery(b, normalized)) return -1;

  const names = [b.name, b.name_i18n?.ar, b.name_i18n?.en]
    .filter(Boolean)
    .map((v) => normalizeText(v!));
  if (names.some((name) => name === normalized)) return 1000;
  if (names.some((name) => name.startsWith(normalized))) return 800;
  if (names.some((name) => name.includes(normalized))) return 600;

  const products = normalizeText(
    [b.products, b.products_i18n?.ar, b.products_i18n?.en].filter(Boolean).join(" "),
  );
  if (products.includes(normalized)) return 400;
  return 200;
}
