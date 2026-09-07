/**
 * "انضم إلى Pure Table" — partner interest requests and the pre-launch
 * waitlist. Visitors submit through the publishable key (insert-only policies);
 * only an admin can read, update the status, or delete.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/businesses.server";

export const LEAD_STATUSES = ["new", "contacted", "interested", "agreed", "not_interested"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  interested: "مهتم",
  agreed: "تم الاتفاق",
  not_interested: "غير مهتم",
};

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Public database configuration is unavailable");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const LeadInput = z.object({
  business_name: z.string().min(1).max(160),
  business_type: z.string().max(80).nullish(),
  city: z.string().max(80).nullish(),
  contact_name: z.string().max(120).nullish(),
  phone: z.string().max(40).nullish(),
  email: z.string().max(255).nullish(),
  website: z.string().max(300).nullish(),
  instagram: z.string().max(300).nullish(),
  notes: z.string().max(2000).nullish(),
});

export const submitPartnerLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LeadInput.parse(d))
  .handler(async ({ data }) => {
    const { error } = await publicClient()
      .from("partner_leads")
      .insert({ ...data, status: "new" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        city: z.string().max(80).nullish(),
        source: z.string().max(80).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { error } = await publicClient().from("waitlist").insert(data);
    // A repeat sign-up is a success from the visitor's point of view.
    if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const listPartnerLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("partner_leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setPartnerLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES), notes: z.string().max(2000).nullish() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const patch = { status: data.status, ...(data.notes !== undefined ? { notes: data.notes } : {}) };
    const { error } = await context.supabase.from("partner_leads").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePartnerLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("partner_leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
