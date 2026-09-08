import type { SupabaseClient } from "@supabase/supabase-js";
import { extractUrl } from "@/lib/link-url";
import { findCity, regionForCity } from "@/lib/saudi";
import { normalizeCategory } from "@/data/businesses";

export type ImportRow = Record<string, string>;

export type FieldValue = string | number | boolean | string[] | Record<string, string>;

export type RowStatus = "ready" | "incomplete" | "choose" | "failed" | "skipped";

export type PlanBranch = {
  placeId: string;
  name: string;
  address: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  phone: string | null;
  hours: Record<string, string>;
};

export type RowPlan = {
  index: number;
  action: "create" | "update" | "skip" | "choose";
  status: RowStatus;
  name: string;
  slug: string;
  matchedBy: "id" | "slug" | "name" | "name+city" | null;
  matchedId: string | null;
  fields: Record<string, FieldValue>;
  links: { platform: string; url: string; product_name: string | null; label: string | null }[];
  imageUrl: string | null;
  errors: string[];
  /** Fields missing from the uploaded file — shown in amber, saved as review notes. */
  missing: string[];
  branches: PlanBranch[];
  placeId: string | null;
};

const PLATFORMS = ["hungerstation", "jahez", "thechefz", "toyou", "keeta", "website", "instagram", "x", "tiktok", "snapchat", "facebook", "whatsapp", "email", "maps", "phone"] as const;
const CATEGORIES = ["restaurant", "cafe", "bakery", "dessert", "home", "supermarket", "fine_dining", "delivery"] as const;
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const TEXT_FIELDS = [
  "name", "name_ar", "city", "city_ar", "address", "address_ar",
  "phone", "instagram", "website", "maps_url", "cover_url",
  "description", "description_ar", "products", "products_ar",
] as const;

/** Minimal RFC4180-ish CSV/TSV parser. */
export function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const firstLine = clean.split("\n")[0] ?? "";
  const delim = firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === delim) { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  row.push(field);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const HEADER_ALIASES: Record<string, string> = {
  "business name": "name", "business": "name", "الاسم": "name", "اسم": "name",
  "اسم المكان": "name", "اسم المطعم": "name", "اسم النشاط": "name", "المكان": "name", "الاسم بالانجليزي": "name",
  "arabic name": "name_ar", "name (ar)": "name_ar", "الاسم بالعربي": "name_ar", "الاسم بالعربية": "name_ar",
  "type": "category", "التصنيف": "category", "النوع": "category",
  "الفئة": "category", "الفئه": "category", "القسم": "category", "نوع النشاط": "category", "التصنيف/النوع": "category",
  "المدينة": "city", "المدينه": "city", "city (ar)": "city_ar",
  "المنطقة": "region", "المنطقه": "region", "region": "region", "area": "region", "province": "region",
  "العنوان": "address", "الموقع": "address", "address (ar)": "address_ar",
  "latitude": "lat", "longitude": "lng",
  "الجوال": "phone", "الهاتف": "phone", "رقم الجوال": "phone", "mobile": "phone", "whatsapp": "phone",
  "google maps": "maps_url", "maps": "maps_url", "map": "maps_url", "maps link": "maps_url",
  "رابط الموقع": "maps_url", "قوقل ماب": "maps_url", "خرائط جوجل": "maps_url",
  "cover": "image_url", "photo": "image_url", "image": "image_url", "cover photo": "image_url", "الصورة": "image_url",
  "cover url": "cover_url",
  "الوصف": "description", "description (ar)": "description_ar",
  "المنتجات": "products", "المنتج": "products", "products (ar)": "products_ar",
  "site": "website", "web": "website", "الموقع الالكتروني": "website", "الموقع الإلكتروني": "website",
  "ig": "instagram", "انستقرام": "instagram", "الانستقرام": "instagram", "instagram account": "instagram",
};

export function normalizeHeader(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (HEADER_ALIASES[key]) return HEADER_ALIASES[key];
  return key.replace(/[\s-]+/g, "_");
}

export function rowsToObjects(matrix: string[][]): ImportRow[] {
  if (matrix.length < 2) return [];
  const headers = (matrix[0] ?? []).map(normalizeHeader);
  return matrix.slice(1).map((cells) => {
    const obj: ImportRow = {};
    headers.forEach((h, i) => {
      if (!h) return;
      obj[h] = (cells[i] ?? "").trim();
    });
    return obj;
  });
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/[\u0600-\u06FF]+/g, "")
    .replace(/^-+|-+$/g, "");
  return base || "business-" + Math.random().toString(36).slice(2, 8);
}

function truthy(v: string | undefined) {
  if (v === undefined) return undefined;
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  return ["true", "yes", "y", "1", "نعم", "published", "verified"].includes(s);
}

export function mapCategory(raw: string): string | null {
  const c = raw.toLowerCase().trim();
  if (!c) return null;
  const has = (...tokens: string[]) => tokens.some((t) => c.includes(t));
  const mapped =
    c.startsWith("fine") || has("فاين", "راقي", "فخم") ? "restaurant"
    : c.startsWith("deliver") || has("توصيل", "طلبات") ? "restaurant"

    : c.startsWith("cafe") || c.startsWith("coffee") || has("قهوة", "قهوه", "كافيه", "كافي", "مقهى", "مقاهي") ? "cafe"
    : c.startsWith("bak") || has("مخبز", "مخابز", "خبز", "فرن", "بيكري") ? "bakery"
    : c.startsWith("dessert") || c.startsWith("sweet") || c.startsWith("pastry") || has("حلوي", "حلا", "حلويات", "معجنات", "كيك") ? "dessert"
    : c.startsWith("home") || c.startsWith("family") || has("منزل", "منزلي", "منتجة", "منتجه", "أسر", "اسر", "بيتي", "بيتية", "بيتيه") ? "home"
    : c.startsWith("super") || c.startsWith("grocer") || c.startsWith("market") || c.startsWith("hyper") || has("سوبر", "ماركت", "بقالة", "بقاله", "تموين", "متجر", "هايبر") ? "supermarket"
    : c.startsWith("rest") || has("مطعم", "مطاعم") ? "restaurant"
    : c;
  if ((CATEGORIES as readonly string[]).includes(mapped)) return mapped;
  // Anything else (including raw Google Maps place types like "grocery_store"
  // or "fine_dining_restaurant") is folded onto a valid category.
  return normalizeCategory(raw);
}

type ExistingBusiness = {
  id: string;
  slug: string;
  name: string;
  name_ar: string | null;
  city: string | null;
  hours: Record<string, string> | null;
};

/** Normalize imported names for duplicate checks. */
function normalizeName(v: string) {
  return v
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[ةه]/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** name + city key used to detect duplicates. */
export function dupeKey(name: string, city: string | null | undefined) {
  return `${normalizeName(name)}|${normalizeName(city ?? "")}`;
}

function nameCityKeys(b: ExistingBusiness) {
  const keys = [dupeKey(b.name, b.city)];
  if (b.name_ar) keys.push(dupeKey(b.name_ar, b.city));
  return keys;
}

export async function buildPlan(
  client: SupabaseClient,
  rows: ImportRow[],
): Promise<{ plan: RowPlan[]; summary: ReturnType<typeof summarize> }> {
  const { data: existingRows, error } = await client
    .from("businesses")
    .select("id, slug, name, name_ar, city, hours");
  if (error) throw new Error(error.message);
  const existing = (existingRows ?? []) as ExistingBusiness[];
  const byId = new Map(existing.map((b) => [b.id, b]));
  const bySlug = new Map(existing.map((b) => [b.slug.toLowerCase(), b]));
  const byName = new Map(existing.map((b) => [normalizeName(b.name), b]));
  const byNameCity = new Map<string, ExistingBusiness>();
  for (const b of existing) for (const k of nameCityKeys(b)) byNameCity.set(k, b);

  const seenInSheet = new Set<string>();

  const plan: RowPlan[] = rows.map((row, index) => {
    const errors: string[] = [];
    const name = (row["name"] ?? "").trim();
    const idCell = row["id"] ?? "";
    const cityCell = (row["city"] ?? "").trim();

    let match: ExistingBusiness | undefined;
    let matchedBy: RowPlan["matchedBy"] = null;
    if (idCell && byId.has(idCell)) { match = byId.get(idCell); matchedBy = "id"; }
    if (!match && row["slug"] && bySlug.has(row["slug"].toLowerCase())) {
      match = bySlug.get(row["slug"].toLowerCase()); matchedBy = "slug";
    }
    if (!match && name && byNameCity.has(dupeKey(name, cityCell))) {
      match = byNameCity.get(dupeKey(name, cityCell)); matchedBy = "name+city";
    }
    if (!match && name && byName.has(normalizeName(name))) {
      match = byName.get(normalizeName(name)); matchedBy = "name";
    }

    const fields: Record<string, FieldValue> = {};
    for (const f of TEXT_FIELDS) {
      const v = row[f];
      if (v) fields[f] = v;
    }
    if (row["category"]) {
      const mapped = mapCategory(row["category"]);
      if (mapped) fields["category"] = mapped;
      else errors.push(`Unknown category "${row["category"]}"`);
    }

    for (const k of ["lat", "lng"] as const) {
      if (row[k]) {
        const n = Number(row[k]);
        if (Number.isFinite(n)) fields[k] = n;
        else errors.push(`Invalid ${k}`);
      }
    }
    const verified = truthy(row["verified"]);
    if (verified !== undefined) fields["verified"] = verified;
    const published = truthy(row["published"]);
    if (published !== undefined) fields["published"] = published;
    const noLocation = truthy(row["no_location"]);
    if (noLocation !== undefined) fields["no_location"] = noLocation;

    // The region is never typed by hand: it is derived from the city (or from a
    // region column when the sheet only has "المنطقة الشرقية" style values).
    const derivedRegion =
      regionForCity(cityCell) ??
      regionForCity(row["city_ar"] ?? "") ??
      regionForCity(row["region"] ?? "") ??
      regionForCity(row["address"] ?? "");
    if (derivedRegion) fields["region"] = derivedRegion;
    // A region-only sheet value still gives us a usable city label.
    if (!cityCell && row["region"]) {
      const guessed = findCity(row["region"]);
      if (guessed) { fields["city"] = guessed.en; fields["city_ar"] = guessed.ar; }
    }

    const hours: Record<string, string> = { ...(match?.hours ?? {}) };
    let hoursTouched = false;
    for (const d of DAYS) {
      const v = row[`hours_${d}`] ?? row[d];
      if (v) { hours[d] = v; hoursTouched = true; }
    }
    if (hoursTouched) fields["hours"] = hours;

    const links: RowPlan["links"] = [];
    for (const p of PLATFORMS) {
      const url = row[p] || row[`${p}_url`] || row[`link_${p}`];
      if (url) {
        links.push({
          platform: p,
          url,
          product_name: row[`${p}_product`] || row[`${p}_item`] || null,
          label: row[`${p}_label`] || null,
        });
      }
    }

    const slug = row["slug"] || match?.slug || slugify(name);
    if (!match) {
      if (!name) errors.push("Missing name");
      if (!fields["category"]) errors.push("Missing category");
    }

    // Duplicate rows inside the same sheet are never imported twice.
    const key = dupeKey(name, cityCell);
    if (name) {
      if (seenInSheet.has(key)) errors.push("Duplicate row in the sheet — skipped");
      else seenInSheet.add(key);
    }

    const imageUrl = row["image_url"] && /^https?:\/\//i.test(row["image_url"]) ? row["image_url"] : null;

    return {
      index,
      // Businesses that already exist are left untouched — a sync only brings
      // in rows that are new, so manual edits in the admin are never overwritten.
      action: errors.length ? "skip" : match ? "skip" : "create",
      status: errors.length ? "failed" : match ? "skipped" : "ready",

      name: name || match?.name || slug,
      slug,
      matchedBy,
      matchedId: match?.id ?? null,
      fields,
      links,
      imageUrl,
      errors,
      missing: [],
      branches: [],
      placeId: null,
    };
  });

  for (const row of plan) await enrichRow(row);

  return { plan, summary: summarize(plan) };
}

export function summarize(plan: RowPlan[]) {
  return {
    create: plan.filter((p) => p.action === "create").length,
    update: plan.filter((p) => p.action === "update").length,
    skip: plan.filter((p) => p.action === "skip").length,
    choose: plan.filter((p) => p.action === "choose").length,
    incomplete: plan.filter((p) => p.status === "incomplete").length,
  };
}

/** Details that require administrator review when missing from the file. */
const REVIEW_FIELDS: [string, string][] = [
  ["address", "address"],
  ["lat", "location coordinates"],
  ["lng", "longitude"],
  ["phone", "phone number"],
  ["website", "website"],
  ["instagram", "Instagram"],
  ["hours", "opening hours"],
];

/** Home businesses / cloud kitchens have no storefront: strip map + hours fields. */
function isLocationless(row: RowPlan) {
  return row.fields["category"] === "home" || row.fields["no_location"] === true;
}

function applyLocationlessRules(row: RowPlan) {
  if (!isLocationless(row)) return;
  row.fields["no_location"] = true;
  for (const k of ["address", "address_ar", "lat", "lng", "maps_url", "hours"]) delete row.fields[k];
  row.branches = [];
}

/** Recompute which fields are still empty and set the row status accordingly. */
export function scoreRow(row: RowPlan) {
  applyLocationlessRules(row);
  if (row.action === "skip" || row.action === "choose") return;
  const locationless = isLocationless(row);
  const missing: string[] = [];
  for (const [key, label] of REVIEW_FIELDS) {
    if (locationless && ["address", "lat", "lng", "hours"].includes(key)) continue;
    const v = row.fields[key];
    const empty = v === undefined || v === "" || (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0);
    if (empty) missing.push(label);
  }
  if (!row.imageUrl && !row.fields["cover_url"]) missing.push("photo / logo");
  if (!row.links.length && !row.fields["website"]) missing.push("delivery links");
  row.missing = missing;
  row.status = missing.length ? "incomplete" : "ready";
  row.fields["needs_review"] = missing.length > 0;
  row.fields["review_notes"] = missing;
}

/** Validate the supplied data locally; never fetch or infer business details. */
export async function enrichRow(row: RowPlan): Promise<RowPlan> {
  if (row.action === "skip") return row;
  if (!row.matchedId && !row.fields["city"]) {
    row.errors.push("Missing city");
    row.status = "failed";
    row.action = "skip";
  }
  scoreRow(row);
  return row;
}

export async function ingestImage(url: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    const ext = type.split("/")[1]?.split(";")[0] ?? "jpg";
    const path = `${Date.now()}-${slug}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("business-covers")
      .upload(path, buf, { contentType: type, upsert: true });
    if (error) return null;
    const publicBase = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
    if (!publicBase) return null;
    return `${publicBase}/storage/v1/object/public/business-covers/${encodeURIComponent(path)}`;
  } catch {
    return null;
  }
}

export type ImportResult = {
  name: string;
  action: string;
  ok: boolean;
  status: RowStatus;
  message?: string;
  missing?: string[];
  branches?: number;
};

async function syncBranches(client: SupabaseClient, businessId: string, branches: PlanBranch[]) {
  if (!branches.length) return 0;
  const { data: current } = await client
    .from("business_branches")
    .select("id, place_id, address")
    .eq("business_id", businessId);
  const existing = (current ?? []) as { id: string; place_id: string | null; address: string | null }[];
  // One upsert for the whole set instead of a round-trip per branch.
  const payloads = branches.map((b, i) => {
    const match =
      existing.find((e) => e.place_id && e.place_id === b.placeId) ??
      existing.find((e) => e.address && b.address && e.address.trim().toLowerCase() === b.address.trim().toLowerCase());
    const payload: Record<string, unknown> = {
      business_id: businessId,
      place_id: b.placeId,
      name: b.name,
      address: b.address,
      city: b.city,
      lat: b.lat,
      lng: b.lng,
      maps_url: b.mapsUrl,
      phone: b.phone,
      hours: b.hours,
      sort_order: i,
      published: true,
    };
    if (match) payload["id"] = match.id;
    return payload;
  });
  const { error } = await client.from("business_branches").upsert(payloads as never, { onConflict: "id" });
  return error ? 0 : payloads.length;
}

export async function applyPlan(client: SupabaseClient, plan: RowPlan[]): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  for (const row of plan) {
    if (row.action === "skip" || row.action === "choose") {
      results.push({
        name: row.name,
        action: row.action,
        ok: false,
        status: row.action === "choose" ? "choose" : "failed",
        message: row.errors.join("; ") || "Waiting for you to pick the right place",
      });
      continue;
    }
    try {
      const payload: Record<string, FieldValue> = { ...row.fields, slug: row.slug };
      // Imports never grant consent or change an existing approval decision.
      if (row.matchedId) delete payload["published"];
      else payload["published"] = false;
      if (row.matchedId) payload["id"] = row.matchedId;
      if (row.imageUrl) {
        const stored = await ingestImage(row.imageUrl, row.slug);
        if (stored) payload["cover_url"] = stored;
      }
      const { data: saved, error } = await client
        .from("businesses")
        .upsert(payload as never, { onConflict: "id" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (row.links.length) {
        const { data: current } = await client
          .from("business_links")
          .select("id, platform, product_name")
          .eq("business_id", saved.id);
        const existing = (current ?? []) as { id: string; platform: string; product_name: string | null }[];
        // Build every link row first, then write them in a single upsert.
        const linkPayloads: Record<string, FieldValue | null>[] = [];
        for (const [i, link] of row.links.entries()) {
          // Sheet cells often hold share text; skip anything without a real URL.
          const cleanUrl = extractUrl(link.url);
          if (!cleanUrl) continue;
          const match = existing.find(
            (l) => l.platform === link.platform && (l.product_name ?? "") === (link.product_name ?? ""),
          );
          const linkPayload: Record<string, FieldValue | null> = {
            business_id: saved.id,
            platform: link.platform,
            url: cleanUrl,
            product_name: link.product_name,
            label: link.label,
            sort_order: i,
          };
          if (match) linkPayload["id"] = match.id;
          linkPayloads.push(linkPayload);
        }
        if (linkPayloads.length) {
          const { error: linkErr } = await client
            .from("business_links")
            .upsert(linkPayloads as never, { onConflict: "id" });
          if (linkErr) throw new Error(linkErr.message);
        }
      }

      const branchCount = await syncBranches(client, saved.id, row.branches);

      results.push({
        name: row.name,
        action: row.action,
        ok: true,
        status: row.missing.length ? "incomplete" : "ready",
        missing: row.missing,
        branches: branchCount,
      });
    } catch (e) {
      results.push({
        name: row.name,
        action: row.action,
        ok: false,
        status: "failed",
        message: e instanceof Error ? e.message : "Failed",
      });
    }
  }
  return results;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Read a publicly shared Google Sheet through Google's standard CSV export. */
export async function fetchSheetMatrix(sheetUrlOrId: string, tab?: string): Promise<string[][]> {
  const idMatch = sheetUrlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = idMatch ? idMatch[1] : sheetUrlOrId.trim();
  if (!spreadsheetId) throw new Error("Could not read the spreadsheet ID from that link.");
  const query = new URLSearchParams({ tqx: "out:csv" });
  if (tab?.trim()) query.set("sheet", tab.trim());
  const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/gviz/tq?${query}`;
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) throw new Error(`Google Sheets error [${res.status}]: ${body}`);
  if (/^<!doctype html/i.test(body.trim())) {
    throw new Error("The Google Sheet must be shared for anyone with the link to view.");
  }
  return parseCsv(body).filter((r) => r.some((v) => v.trim() !== "")).slice(0, 2001);
}

/** Attach already-uploaded cover files to businesses by filename. */
export async function attachCoversByFilename(
  client: SupabaseClient,
  items: { filename: string; readUrl: string }[],
) {
  const { data: rows, error } = await client.from("businesses").select("id, slug, name");
  if (error) throw new Error(error.message);
  const list = (rows ?? []) as { id: string; slug: string; name: string }[];
  // Indexed lookups instead of scanning the whole list per file.
  const bySlug = new Map(list.map((b) => [b.slug.toLowerCase(), b]));
  const byNameSlug = new Map(list.map((b) => [slugify(b.name), b]));
  const byName = new Map(list.map((b) => [b.name.trim().toLowerCase(), b]));

  const matched = items.map((item) => {
    const stem = item.filename.replace(/\.[^.]+$/, "");
    const key = slugify(stem);
    const target = bySlug.get(key) ?? byNameSlug.get(key) ?? byName.get(stem.trim().toLowerCase()) ?? null;
    return { item, target };
  });

  const results: { filename: string; matched: string | null }[] = [];
  const CHUNK = 8;
  for (let i = 0; i < matched.length; i += CHUNK) {
    const slice = matched.slice(i, i + CHUNK);
    const done = await Promise.all(
      slice.map(async ({ item, target }) => {
        if (!target) return { filename: item.filename, matched: null };
        const { error: updErr } = await client
          .from("businesses")
          .update({ cover_url: item.readUrl })
          .eq("id", target.id);
        return { filename: item.filename, matched: updErr ? null : target.name };
      }),
    );
    results.push(...done);
  }
  return results;
}

/**
 * Saved Google Sheet used by the Sync now button and the daily auto sync.
 *
 * These settings live in `app_config` (admin-only) — they used to sit inside
 * `site_settings.content`, which every visitor can read.
 */
export type SheetSyncSettings = { sheet: string; tab: string; auto: boolean; lastRun?: string | null };

export async function readSheetSync(client: SupabaseClient): Promise<SheetSyncSettings> {
  const { data } = await client.from("app_config").select("value").eq("key", "sheet_sync").maybeSingle();
  let cfg: Partial<SheetSyncSettings> = {};
  try {
    cfg = data?.value ? (JSON.parse(data.value) as Partial<SheetSyncSettings>) : {};
  } catch {
    cfg = {};
  }
  return { sheet: cfg.sheet ?? "", tab: cfg.tab ?? "", auto: !!cfg.auto, lastRun: cfg.lastRun ?? null };
}

export async function writeSheetSync(client: SupabaseClient, next: SheetSyncSettings) {
  const { error } = await client
    .from("app_config")
    .upsert({ key: "sheet_sync", value: JSON.stringify(next) } as never, { onConflict: "key" });
  if (error) throw new Error(error.message);
  return next;
}
