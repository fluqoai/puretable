import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { normalizeSettings, type SiteSettings } from "@/lib/site-settings";

/**
 * Published site settings, read on the server so the admin's own texts are in
 * the very first render instead of flashing the built-in defaults first.
 */
export const getSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Public database configuration is unavailable");
  const client = createClient(url, key, {
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
  const { data, error } = await client
    .from("site_settings")
    .select("theme, content, sections, layout")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeSettings(data);
});
