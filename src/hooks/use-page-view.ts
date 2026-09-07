import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { track } from "@/lib/track";

/**
 * Records a page_view in Pure Table's own analytics table on every route
 * change, plus a lightweight heartbeat so "visitors online now" is real.
 */
export function usePageView(opts: { business_slug?: string; city?: string; search_query?: string } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const slug = opts.business_slug;
  const city = opts.city;
  const search = opts.search_query;

  useEffect(() => {
    if (typeof window === "undefined") return;
    track({
      event_type: "page_view",
      business_slug: slug ?? null,
      city: city ?? null,
      query: search ?? null,
    });
    const beat = window.setInterval(() => track({ event_type: "heartbeat" }), 120_000);
    return () => window.clearInterval(beat);
  }, [pathname, slug, city, search]);
}
