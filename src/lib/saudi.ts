/**
 * Saudi Arabia regions + cities.
 *
 * Used by the public filters (pick a region, then a city) and by the admin
 * form / importer, which derives the region automatically from the city so
 * nobody has to type it.
 */

export type SaudiCity = { en: string; ar: string; aliases?: string[] };
export type SaudiRegion = { key: string; en: string; ar: string; cities: SaudiCity[] };

export const SAUDI_REGIONS: SaudiRegion[] = [
  {
    key: "riyadh",
    en: "Riyadh Region",
    ar: "منطقة الرياض",
    cities: [
      { en: "Riyadh", ar: "الرياض" },
      { en: "Diriyah", ar: "الدرعية" },
      { en: "Al Kharj", ar: "الخرج" },
      { en: "Al Majmaah", ar: "المجمعة" },
      { en: "Al Zulfi", ar: "الزلفي" },
      { en: "Wadi Al Dawasir", ar: "وادي الدواسر" },
      { en: "Al Quwaiiyah", ar: "القويعية" },
      { en: "Afif", ar: "عفيف" },
      { en: "Al Dawadmi", ar: "الدوادمي" },
      { en: "Shaqra", ar: "شقراء" },
      { en: "Huraymila", ar: "حريملاء" },
      { en: "Thadiq", ar: "ثادق" },
      { en: "Al Aflaj", ar: "الأفلاج" },
      { en: "Hotat Bani Tamim", ar: "حوطة بني تميم" },
    ],
  },
  {
    key: "makkah",
    en: "Makkah Region",
    ar: "منطقة مكة المكرمة",
    cities: [
      { en: "Jeddah", ar: "جدة", aliases: ["جده"] },
      { en: "Makkah", ar: "مكة المكرمة", aliases: ["مكة", "مكه", "mecca"] },
      { en: "Taif", ar: "الطائف" },
      { en: "Rabigh", ar: "رابغ" },
      { en: "Al Qunfudhah", ar: "القنفذة" },
      { en: "Al Lith", ar: "الليث" },
      { en: "Khulais", ar: "خليص" },
      { en: "Al Jumum", ar: "الجموم" },
      { en: "Turbah", ar: "تربة" },
    ],
  },
  {
    key: "madinah",
    en: "Madinah Region",
    ar: "منطقة المدينة المنورة",
    cities: [
      { en: "Madinah", ar: "المدينة المنورة", aliases: ["المدينة", "المدينه", "medina"] },
      { en: "Yanbu", ar: "ينبع" },
      { en: "Al Ula", ar: "العلا" },
      { en: "Badr", ar: "بدر" },
      { en: "Khaybar", ar: "خيبر" },
      { en: "Mahd Al Dhahab", ar: "مهد الذهب" },
    ],
  },
  {
    key: "eastern",
    en: "Eastern Province",
    ar: "المنطقة الشرقية",
    cities: [
      { en: "Eastern Province", ar: "المنطقة الشرقية", aliases: ["الشرقية", "الشرقيه", "eastern"] },
      { en: "Dammam", ar: "الدمام" },

      { en: "Khobar", ar: "الخبر" },
      { en: "Dhahran", ar: "الظهران" },
      { en: "Qatif", ar: "القطيف" },
      { en: "Jubail", ar: "الجبيل" },
      { en: "Al Ahsa", ar: "الأحساء", aliases: ["الاحساء", "الهفوف", "hofuf"] },
      { en: "Hafar Al Batin", ar: "حفر الباطن" },
      { en: "Ras Tanura", ar: "رأس تنورة" },
      { en: "Khafji", ar: "الخفجي" },
      { en: "Nairyah", ar: "النعيرية" },
    ],
  },
  {
    key: "asir",
    en: "Asir Region",
    ar: "منطقة عسير",
    cities: [
      { en: "Southern Region", ar: "المنطقة الجنوبية", aliases: ["الجنوبية", "الجنوبيه", "southern"] },
      { en: "Abha", ar: "أبها", aliases: ["ابها"] },

      { en: "Khamis Mushait", ar: "خميس مشيط" },
      { en: "Bisha", ar: "بيشة" },
      { en: "Mahayel Asir", ar: "محايل عسير" },
      { en: "Al Namas", ar: "النماص" },
      { en: "Rijal Almaa", ar: "رجال ألمع" },
      { en: "Sarat Abidah", ar: "سراة عبيدة" },
    ],
  },
  {
    key: "qassim",
    en: "Qassim Region",
    ar: "منطقة القصيم",
    cities: [
      { en: "Buraydah", ar: "بريدة" },
      { en: "Unaizah", ar: "عنيزة" },
      { en: "Al Rass", ar: "الرس" },
      { en: "Al Bukayriyah", ar: "البكيرية" },
      { en: "Al Mithnab", ar: "المذنب" },
    ],
  },
  {
    key: "hail",
    en: "Hail Region",
    ar: "منطقة حائل",
    cities: [
      { en: "Hail", ar: "حائل" },
      { en: "Baqaa", ar: "بقعاء" },
      { en: "Al Shinan", ar: "الشنان" },
    ],
  },
  {
    key: "tabuk",
    en: "Tabuk Region",
    ar: "منطقة تبوك",
    cities: [
      { en: "Tabuk", ar: "تبوك" },
      { en: "Duba", ar: "ضباء" },
      { en: "Umluj", ar: "أملج" },
      { en: "Haql", ar: "حقل" },
      { en: "NEOM", ar: "نيوم" },
    ],
  },
  {
    key: "northern",
    en: "Northern Borders",
    ar: "منطقة الحدود الشمالية",
    cities: [
      { en: "Arar", ar: "عرعر" },
      { en: "Rafha", ar: "رفحاء" },
      { en: "Turaif", ar: "طريف" },
    ],
  },
  {
    key: "jazan",
    en: "Jazan Region",
    ar: "منطقة جازان",
    cities: [
      { en: "Jazan", ar: "جازان" },
      { en: "Sabya", ar: "صبيا" },
      { en: "Abu Arish", ar: "أبو عريش" },
      { en: "Samtah", ar: "صامطة" },
      { en: "Farasan", ar: "فرسان" },
    ],
  },
  {
    key: "najran",
    en: "Najran Region",
    ar: "منطقة نجران",
    cities: [
      { en: "Najran", ar: "نجران" },
      { en: "Sharurah", ar: "شرورة" },
    ],
  },
  {
    key: "baha",
    en: "Al Baha Region",
    ar: "منطقة الباحة",
    cities: [
      { en: "Al Baha", ar: "الباحة" },
      { en: "Baljurashi", ar: "بلجرشي" },
      { en: "Al Mandaq", ar: "المندق" },
    ],
  },
  {
    key: "jouf",
    en: "Al Jouf Region",
    ar: "منطقة الجوف",
    cities: [
      { en: "Sakaka", ar: "سكاكا" },
      { en: "Qurayyat", ar: "القريات" },
      { en: "Dumat Al Jandal", ar: "دومة الجندل" },
    ],
  },
];

function fold(v: string) {
  return v
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/^ال/, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export const ALL_CITIES: (SaudiCity & { region: string })[] = SAUDI_REGIONS.flatMap((r) =>
  r.cities.map((c) => ({ ...c, region: r.key })),
);

/**
 * The short list offered in the admin form. Everything else still works when it
 * arrives from Google Maps or a spreadsheet — this is only the picker.
 */
export const MAIN_CITIES: { en: string; ar: string }[] = [
  { en: "Riyadh", ar: "الرياض" },
  { en: "Jeddah", ar: "جدة" },
  { en: "Makkah", ar: "مكة المكرمة" },
  { en: "Madinah", ar: "المدينة المنورة" },
  { en: "Yanbu", ar: "ينبع" },
  { en: "Eastern Province", ar: "المنطقة الشرقية" },
  { en: "Taif", ar: "الطائف" },
  { en: "Southern Region", ar: "المنطقة الجنوبية" },
];


/** Find the canonical city entry from any spelling (Arabic/English/alias). */
export function findCity(raw: string | null | undefined) {
  const q = fold(raw ?? "");
  if (!q) return null;
  return (
    ALL_CITIES.find((c) =>
      [c.en, c.ar, ...(c.aliases ?? [])].some((v) => {
        const f = fold(v);
        return f === q || (f.length > 2 && q.includes(f));
      }),
    ) ?? null
  );
}

/** Guess the region key for a free-text city (or region) value. */
export function regionForCity(raw: string | null | undefined): string | null {
  const city = findCity(raw);
  if (city) return city.region;
  const q = fold(raw ?? "");
  if (!q) return null;
  const region = SAUDI_REGIONS.find((r) =>
    [r.en, r.ar].some((v) => {
      const f = fold(v.replace(/^(منطقة|Region)\s*/i, ""));
      return f.length > 2 && (q.includes(f) || f.includes(q));
    }),
  );
  return region?.key ?? null;
}

export function regionByKey(key: string | null | undefined) {
  return SAUDI_REGIONS.find((r) => r.key === key) ?? null;
}

/** Localized city label, falling back to whatever was stored. */
export function cityLabel(raw: string | null | undefined, lang: "en" | "ar") {
  const city = findCity(raw);
  return city ? city[lang] : (raw ?? "");
}
