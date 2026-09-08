import { capturePosthog } from "./posthog-client";
/**
 * First-party analytics for Pure Table.
 *
 * Every meaningful interaction is written straight into the `analytics_events`
 * table (no Google Analytics involved). Outbound links never point at the
 * external URL directly — they go through `/go?...` so the click is stored
 * before the redirect happens.
 */

const VISITOR_KEY = "pt.vid";
const SESSION_KEY = "pt.sid";
export const ADMIN_KEY = "pt.admin";

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Stable anonymous id (no personal data), kept in localStorage. */
export function visitorId(): string {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = uid();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

/** Per-tab/session id, used for "visitors online now". */
export function sessionId(): string {
  if (typeof window === "undefined") return "";
  let v = sessionStorage.getItem(SESSION_KEY);
  if (!v) {
    v = uid();
    sessionStorage.setItem(SESSION_KEY, v);
  }
  return v;
}

/** Admin sessions are flagged so their traffic can be excluded from the stats. */
export function isAdminVisitor(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ADMIN_KEY) === "1";
}

export type TrackPayload = {
  event_type: string;
  business_slug?: string | null;
  link_id?: string | null;
  platform?: string | null;
  label?: string | null;
  city?: string | null;
  query?: string | null;
  metadata?: Record<string, unknown>;
};

export function track(payload: TrackPayload) {
  if (typeof window === "undefined") return;
  if (payload.event_type !== "page_view" && payload.event_type !== "heartbeat") capturePosthog(payload.event_type, { business_slug: payload.business_slug, platform: payload.platform });
  const body = JSON.stringify({
    ...payload,
    path: window.location.pathname,
    visitor_id: visitorId(),
    session_id: sessionId(),
    is_admin: isAdminVisitor(),
    referrer: document.referrer || null,
  });
  try {
    fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the UI */
  }
}

/** Build the internal tracked redirect URL for any outbound link. */
export function goHref(opts: {
  to: string;
  type: string; // click_maps | click_delivery | click_website | click_phone | click_social ...
  business?: string | null; // slug
  linkId?: string | null;
  platform?: string | null;
  label?: string | null;
}) {
  const p = new URLSearchParams({ to: opts.to, type: opts.type });
  if (opts.business) p.set("b", opts.business);
  if (opts.linkId) p.set("link", opts.linkId);
  if (opts.platform) p.set("platform", opts.platform);
  if (opts.label) p.set("label", opts.label.slice(0, 120));
  // Visitor/session ids are appended at click time (see installGoAugmenter) so
  // the server-rendered HTML matches the first client render.
  return `/go?${p.toString()}`;
}

/**
 * Adds the anonymous visitor/session ids to every internal /go link right
 * before the browser follows it.
 */
export function installGoAugmenter() {
  if (typeof document === "undefined") return () => {};
  const handler = (e: Event) => {
    const el = (e.target as HTMLElement | null)?.closest?.("a[href^='/go?']") as HTMLAnchorElement | null;
    if (!el) return;
    const u = new URL(el.getAttribute("href")!, window.location.origin);
    u.searchParams.set("v", visitorId());
    u.searchParams.set("s", sessionId());
    if (isAdminVisitor()) u.searchParams.set("a", "1");
    el.setAttribute("href", `${u.pathname}?${u.searchParams.toString()}`);
  };
  const captureClick = (event: MouseEvent) => {
    const link = (event.target as HTMLElement | null)?.closest?.("a[href^='/go?']") as HTMLAnchorElement | null;
    if (!link) return;
    const params = new URL(link.href).searchParams;
    capturePosthog(params.get("type") || "outbound_click", { business_slug: params.get("b"), platform: params.get("platform") });
  };
  document.addEventListener("click", captureClick, true);
  document.addEventListener("mousedown", handler, true);
  document.addEventListener("touchstart", handler, true);
  document.addEventListener("keydown", handler, true);
  return () => {
    document.removeEventListener("click", captureClick, true);
    document.removeEventListener("mousedown", handler, true);
    document.removeEventListener("touchstart", handler, true);
    document.removeEventListener("keydown", handler, true);
  };
}

/**
 * Records that a set of businesses was shown to a visitor (search results,
 * category listings, home page). One request per rendered list, and only once
 * per business per session so a re-render never inflates the numbers.
 */
const seenImpressions = new Set<string>();

export function trackImpressions(slugs: string[]) {
  if (typeof window === "undefined") return;
  const fresh = slugs.filter((s) => s && !seenImpressions.has(s));
  if (!fresh.length) return;
  for (const s of fresh) seenImpressions.add(s);
  const body = JSON.stringify({
    event_type: "impression",
    business_slugs: fresh.slice(0, 60),
    path: window.location.pathname,
    visitor_id: visitorId(),
    session_id: sessionId(),
    is_admin: isAdminVisitor(),
  });
  try {
    fetch("/api/public/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* analytics must never break the UI */
  }
}
