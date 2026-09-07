import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  applyTheme,
  DEFAULT_SETTINGS,
  normalizeSettings,
  toResourceBundle,
  type SiteSettings,
} from "@/lib/site-settings";

export const SITE_SETTINGS_KEY = ["site-settings"] as const;

/**
 * Reads the published settings, or the unpublished draft when `draft` is true
 * (used by the admin preview so changes can be checked before publishing).
 *
 * The `draft` column is not exposed through the Data API — only admins can read
 * it, through the `get_site_draft` database function.
 */
export async function fetchSiteSettings(draft = false): Promise<SiteSettings> {
  const { data, error } = await supabase
    .from("site_settings")
    .select("theme, content, sections, layout")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (draft) {
    const { data: draftData } = await supabase.rpc("get_site_draft");
    if (draftData) return normalizeSettings(draftData);
  }
  return normalizeSettings(data);
}

/** Reads the admin-controlled settings and keeps the live theme + texts in sync. */
export function useSiteSettings() {
  const { i18n } = useTranslation();
  // Read the URL after mount only: during SSR there is no `window`, so reading
  // it while rendering would make the first client render differ (hydration).
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get("preview") === "1");
  }, []);
  const { data } = useQuery({
    queryKey: [...SITE_SETTINGS_KEY, preview ? "draft" : "live"],
    queryFn: () => fetchSiteSettings(preview),
    staleTime: preview ? 0 : 60_000,
  });
  const settings = data ?? DEFAULT_SETTINGS;

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Every sentence on the site is overridable from the dashboard: the admin
  // content is merged straight into the i18n resources.
  useEffect(() => {
    (["en", "ar"] as const).forEach((lng) => {
      i18n.addResourceBundle(lng, "translation", toResourceBundle(settings.content, lng), true, true);
    });
    i18n.emit("languageChanged", i18n.language);
  }, [settings.content, i18n]);

  return settings;
}

/**
 * Text helper: returns the admin override for the current language when it
 * exists, otherwise the built-in translation.
 */
export function useSiteText() {
  const { t, i18n } = useTranslation();
  const settings = useSiteSettings();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  const text = (key: string) => {
    const override = settings.content[key]?.[lang]?.trim();
    return override ? override : t(key);
  };
  const shows = (section: string) => settings.sections[section] !== false;
  const loc = (v?: { en: string; ar: string }) => (v ? (lang === "ar" ? v.ar || v.en : v.en || v.ar) : "");

  return { text, shows, loc, lang, layout: settings.layout, settings };
}
