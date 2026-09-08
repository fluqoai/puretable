import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { capturePosthog } from "./posthog-client";

export function PosthogAnalytics() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    capturePosthog("$pageview");
  }, [pathname]);
  return null;
}
