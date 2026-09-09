import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/businesses.server";
import type { Database } from "@/integrations/supabase/types";

const httpUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => /^https?:\/\//i.test(value), "Use an http(s) URL");

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Public database configuration is unavailable");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export const listSuccessPartners = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("success_partners")
    .select("id,kind,name,name_ar,logo_url,link_url")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const listSuccessPartnersAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const [partners, businesses] = await Promise.all([
      context.supabase.from("success_partners").select("*").order("created_at"),
      context.supabase
        .from("businesses")
        .select("id,name,name_ar,city,cover_url,slug,published")
        .order("name"),
    ]);
    if (partners.error) throw new Error(partners.error.message);
    if (businesses.error) throw new Error(businesses.error.message);
    return { partners: partners.data ?? [], businesses: businesses.data ?? [] };
  });

export const addBusinessSuccessPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ businessId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: business, error: businessError } = await context.supabase
      .from("businesses")
      .select("id,name,name_ar,cover_url,slug")
      .eq("id", data.businessId)
      .single();
    if (businessError) throw new Error(businessError.message);
    const { data: partner, error } = await context.supabase
      .from("success_partners")
      .upsert(
        {
          kind: "business",
          business_id: business.id,
          name: business.name,
          name_ar: business.name_ar,
          logo_url: business.cover_url,
          link_url: `/business/${business.slug}`,
          active: true,
        },
        { onConflict: "business_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return partner;
  });

export const addExternalSuccessPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        nameAr: z.string().trim().max(160).optional(),
        logoUrl: httpUrl.optional(),
        linkUrl: httpUrl.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: partner, error } = await context.supabase
      .from("success_partners")
      .insert({
        kind: "external",
        name: data.name,
        name_ar: data.nameAr || null,
        logo_url: data.logoUrl || null,
        link_url: data.linkUrl || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return partner;
  });

export const setSuccessPartnerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: partner, error } = await context.supabase
      .from("success_partners")
      .update({ active: data.active })
      .eq("id", data.id)
      .select("id,active")
      .single();
    if (error) throw new Error(error.message);
    return partner;
  });

export const removeSuccessPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: removed, error } = await context.supabase
      .from("success_partners")
      .delete()
      .eq("id", data.id)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return removed;
  });
