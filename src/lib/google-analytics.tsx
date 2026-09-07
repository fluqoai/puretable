import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export const MEASUREMENT_ID =
  import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined;

/** Loads gtag.js once and reports SPA route changes to Google Analytics. */
export function GoogleAnalytics() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (typeof window === "undefined" || !MEASUREMENT_ID) return;
    if (window.gtag) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID);
  }, []);

  useEffect(() => {
    if (!MEASUREMENT_ID || !window.gtag) return;
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname]);

  return null;
}
