import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./businesses.server";
import { readPlanCatalog } from "./subscriptions.server";
import { PlanDefinition } from "./subscriptions";
import type { SupabaseClient } from "@supabase/supabase-js";

export const getPlanDefinitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    return readPlanCatalog(context.supabase);
  });

export const updatePlanDefinition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanDefinition.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, revision, ...changes } = data;
    // Optimistic concurrency prevents overwriting another administrator's edits.
    const { data: row, error } = await (context.supabase as SupabaseClient)
      .from("subscription_plans")
      .update(changes)
      .eq("id", id)
      .eq("revision", revision)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("تغير تعريف الباقة بواسطة أدمن آخر. أعد تحميل الصفحة قبل الحفظ.");
    return PlanDefinition.parse(row);
  });
