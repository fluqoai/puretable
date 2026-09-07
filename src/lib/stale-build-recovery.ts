/**
 * Recovers from a stale-deploy blank screen.
 *
 * After a redeploy the browser can hold cached HTML/JS from the previous build.
 * Two symptoms follow: chunk URLs that no longer exist ("Importing a module
 * script failed") and React hydration mismatches ("There was an error while
 * hydrating") — both leave a blank page. In either case a single hard reload
 * fetches the fresh HTML + manifest and fixes it.
 *
 * The listeners are installed at module scope (not in an effect) because a
 * hydration error fires before React commits, i.e. before any effect runs.
 */

const KEY = "pt-chunk-reload";

const STALE_CHUNK =
  /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module/i;
const HYDRATION =
  /error while hydrating|Hydration failed|hydrated but some attributes|Minified React error #(418|421|423|425)/i;

let recovering = false;

async function recover() {
  if (recovering) return;
  recovering = true;
  try {
    if (Number(sessionStorage.getItem(KEY) ?? "0") >= 2) return;
    sessionStorage.setItem(KEY, String(Number(sessionStorage.getItem(KEY) ?? "0") + 1));
  } catch {
    return;
  }

  // A plain reload can be served from the HTTP/bfcache and hand back the same
  // stale HTML that references the missing chunk. Drop every client-side cache
  // first, then reload through a cache-busting URL.
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* best effort */
  }

  const url = new URL(window.location.href);
  url.searchParams.set("_r", Date.now().toString(36));
  window.location.replace(url.toString());
}

function messageOf(value: unknown): string {
  if (!value) return "";
  if (value instanceof Error) return `${value.message} ${value.stack ?? ""}`;
  return String(value);
}

if (typeof window !== "undefined" && !(window as { __ptRecovery?: boolean }).__ptRecovery) {
  (window as { __ptRecovery?: boolean }).__ptRecovery = true;

  window.addEventListener("vite:preloadError", () => recover());

  window.addEventListener("unhandledrejection", (e) => {
    if (STALE_CHUNK.test(messageOf(e.reason))) recover();
  });

  window.addEventListener("error", (e) => {
    const msg = messageOf((e as ErrorEvent).error ?? (e as ErrorEvent).message);
    if (STALE_CHUNK.test(msg) || HYDRATION.test(msg)) recover();
  });

  // React reports recoverable hydration errors through console.error only.
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    original(...args);
    if (args.some((a) => HYDRATION.test(messageOf(a)))) recover();
  };

  // The page loaded fine — clear the guard and the cache-busting param so a
  // future stale build can recover too and the URL stays clean.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("_r")) {
        url.searchParams.delete("_r");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    } catch {
      /* ignore */
    }
  }, 8000);
}

export {};
