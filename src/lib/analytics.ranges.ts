/** Time ranges offered in the dashboard. `all` = since launch. */
export const RANGES = ["today", "7d", "30d", "90d", "365d", "all"] as const;
export type RangeKey = (typeof RANGES)[number];

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "اليوم / Today",
  "7d": "آخر ٧ أيام / 7 days",
  "30d": "آخر ٣٠ يومًا / 30 days",
  "90d": "آخر ٩٠ يومًا / 90 days",
  "365d": "آخر ٣٦٥ يومًا / 365 days",
  all: "منذ التأسيس / All time",
};

/** Start of the chosen reporting range. Saudi Arabia is permanently UTC+3. */
export function sinceFor(range: RangeKey, nowMs = Date.now()): string | null {
  const now = nowMs;
  const day = 86400_000;
  switch (range) {
    case "today": {
      const riyadh = new Date(now + 3 * 60 * 60_000);
      const midnightUtc =
        Date.UTC(riyadh.getUTCFullYear(), riyadh.getUTCMonth(), riyadh.getUTCDate()) -
        3 * 60 * 60_000;
      return new Date(midnightUtc).toISOString();
    }
    case "7d":
      return new Date(now - 7 * day).toISOString();
    case "30d":
      return new Date(now - 30 * day).toISOString();
    case "90d":
      return new Date(now - 90 * day).toISOString();
    case "365d":
      return new Date(now - 365 * day).toISOString();
    case "all":
      return null;
  }
}
