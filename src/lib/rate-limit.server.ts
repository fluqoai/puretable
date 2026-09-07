/**
 * Very small in-memory rate limiter for the public (unauthenticated) endpoints.
 *
 * Workers are ephemeral, so this is not a hard guarantee — it is a cheap guard
 * that stops a single client from flooding the analytics table with thousands
 * of events per minute without adding any infrastructure.
 */
type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function clientKey(request: Request, suffix = ""): string {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  return `${ip}${suffix ? `:${suffix}` : ""}`;
}

/** Returns true when the caller is still inside its quota for the window. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    // Keep the map from growing without bound on long-lived instances.
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
