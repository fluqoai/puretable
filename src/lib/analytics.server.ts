// Server-only helpers for first-party analytics writes.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

export function analyticsClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
          h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export type EventRow = {
  event_type: string;
  business_id?: string | null;
  link_id?: string | null;
  platform?: string | null;
  label?: string | null;
  path?: string | null;
  visitor_id?: string | null;
  session_id?: string | null;
  city?: string | null;
  query?: string | null;
  is_admin?: boolean;
  metadata?: Record<string, unknown>;
  referrer?: string | null;
  user_agent?: string | null;
  dedupe_key?: string | null;
};

export function analyticsDedupeKey(
  parts: (string | null | undefined)[],
  bucketMs?: number,
  nowMs = Date.now(),
) {
  const bucket = bucketMs ? Math.floor(nowMs / bucketMs) : "stable";
  return createHash("sha256")
    .update(`${parts.map((part) => part ?? "").join("\u001f")}|${bucket}`)
    .digest("hex");
}

export async function insertEvents(rows: EventRow[]) {
  if (!rows.length) return;
  const supabase = analyticsClient();
  const payload = rows.map((row) => ({
    ...row,
    metadata: row.metadata ?? {},
    is_admin: !!row.is_admin,
  }));
  const { error } = await supabase
    .from("analytics_events")
    .upsert(payload, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function insertEvent(row: EventRow) {
  await insertEvents([row]);
}

export async function businessIdForSlug(slug: string | null | undefined) {
  if (!slug) return { id: null as string | null, city: null as string | null };
  const supabase = analyticsClient();
  const { data } = await supabase
    .from("businesses")
    .select("id, city")
    .eq("slug", slug)
    .maybeSingle();
  return { id: data?.id ?? null, city: data?.city ?? null };
}
