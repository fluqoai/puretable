import { z } from "zod";
import { extractUrl } from "@/lib/link-url";

export const BusinessInput = z.object({
  id: z.string().uuid().optional(),
  // Optional: when left empty the server generates one from the name, so a
  // business can be saved as a draft without filling in a URL.
  slug: z.string().regex(/^[a-z0-9-]*$/).optional(),
  name: z.string().min(1),
  name_ar: z.string().nullable().optional(),

  // Built-in filters plus any admin-created filter (stored as `cf_<slug>`).
  category: z.string().regex(/^[a-z_]+$|^cf_[a-z0-9-]+$/),
  categories: z.array(z.string().regex(/^[a-z_]+$|^cf_[a-z0-9-]+$/)).default([]),
  safety: z.enum(["green", "red", "none"]).default("red"),
  region: z.string().nullable().optional(),
  city: z.string().min(1),
  cities: z.array(z.string()).default([]),
  city_ar: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  district_ar: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  address_ar: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  phone: z.string().nullable().optional(),
  /** Optional WhatsApp number or full wa.me link for this business. */
  whatsapp: z.string().nullable().optional(),
  /** Shared-kitchen flag (orange dot) + editable precautions note. */
  shared_kitchen: z.boolean().default(false),
  precautions_note: z.string().nullable().optional(),
  instagram: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  maps_url: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  /** Gallery photos (cover excluded). How many are shown depends on the plan. */
  photos: z.array(z.string()).default([]),
  description: z.string().nullable().optional(),
  description_ar: z.string().nullable().optional(),
  products: z.string().nullable().optional(),
  products_ar: z.string().nullable().optional(),
  hours: z.record(z.string(), z.string()).default({}),
  /** Manual subscription tier — admin only, no payment involved. */
  plan: z.enum(["free", "pro", "premium"]).default("free"),
  offers_booking: z.boolean().default(false),
  discount_code: z.string().max(80).nullable().optional(),
  verified: z.boolean().default(false),
  dedicated_gf: z.boolean().default(false),
  no_location: z.boolean().default(false),
  published: z.boolean().default(false),
  needs_review: z.boolean().default(false),
  review_notes: z.array(z.string()).default([]),
});

export const LinkInput = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  /** When set, the link belongs to that branch instead of the whole business. */
  branch_id: z.string().uuid().nullable().optional(),
  platform: z.enum([
    "hungerstation",
    "jahez",
    "thechefz",
    "toyou",
    "keeta",
    "requeue",
    "mytable",
    "website",
    "instagram",
    "x",
    "tiktok",
    "snapchat",
    "facebook",
    "whatsapp",
    "email",
    "maps",
    "phone",
  ]),
  // Pasted share text is cleaned to the bare URL; anything without a real
  // link is rejected instead of being stored as a broken redirect target.
  url: z
    .string()
    .min(1)
    .transform((v) => extractUrl(v) ?? "")
    .refine((v) => v.length > 0, { message: "الرابط غير صالح — الصق رابطًا يبدأ بـ https://" }),
  label: z.string().nullable().optional(),
  product_name: z.string().nullable().optional(),
  sort_order: z.number().default(0),
});

export const BranchInput = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  name: z.string().min(1),
  name_ar: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  address_ar: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  city_ar: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  district_ar: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  maps_url: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  hours: z.record(z.string(), z.string()).default({}),
  sort_order: z.number().default(0),
  permanently_closed: z.boolean().default(false),
  published: z.boolean().default(true),
  /** Set by package automation only; manual visibility changes clear it. */
  plan_limited: z.boolean().default(false),
});
