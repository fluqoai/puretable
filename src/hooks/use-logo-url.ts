import { useQuery } from "@tanstack/react-query";
import { fetchSiteSettings, SITE_SETTINGS_KEY } from "@/hooks/use-site-settings";
import { DEFAULT_LOGO_URL } from "@/lib/brand";

/** Returns the single published image shared by every brand-logo placement. */
export function useLogoUrl() {
  const { data } = useQuery({
    queryKey: [...SITE_SETTINGS_KEY, "live"],
    queryFn: () => fetchSiteSettings(false),
    staleTime: 60_000,
  });
  return data?.layout.media["logo"]?.trim() || DEFAULT_LOGO_URL;
}
