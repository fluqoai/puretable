import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePlanCatalog } from "./subscriptions";

export async function readPlanCatalog(client: SupabaseClient) {
  const { data, error } = await client.from("subscription_plans").select("*");
  if (error) throw new Error(error.message);
  return parsePlanCatalog(data);
}
