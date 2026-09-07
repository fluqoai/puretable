// First-party analytics collector: POST /api/public/event
//
// Public by necessity (the browser writes here), so it is defended in three
// ways: only known event types are accepted, the payload size is capped, and
// each client is rate limited per minute.
import { createFileRoute } from "@tanstack/react-router";
import {
  analyticsDedupeKey,
  insertEvent,
  insertEvents,
  businessIdForSlug,
  analyticsClient,
} from "@/lib/analytics.server";
import { allow, clientKey } from "@/lib/rate-limit.server";

/** Every event the site is allowed to record. Anything else is dropped. */
const ALLOWED_EVENTS = new Set([
  "page_view",
  "heartbeat",
  "impression",
  "search",
  "filter",
  "filter_click",
  "waitlist_signup",
  "partner_lead",
  "click_maps",
  "click_delivery",
  "click_booking",
  "click_whatsapp",
  "click_website",
  "click_phone",
  "click_social",
  "click_link",
]);

const MAX_BODY = 8_000;

export const Route = createFileRoute("/api/public/event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!allow(clientKey(request, "event"), 240, 60_000)) {
          return new Response("Too many requests", { status: 429 });
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY) return new Response("Payload too large", { status: 413 });
        let body: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            return new Response("Bad request", { status: 400 });
          }
          body = parsed as Record<string, unknown>;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const type = String(body?.event_type ?? "").slice(0, 40);
        if (!ALLOWED_EVENTS.has(type)) return new Response("Bad request", { status: 400 });

        const base = {
          event_type: type,
          platform: body?.platform ? String(body.platform).slice(0, 60) : null,
          label: body?.label ? String(body.label).slice(0, 200) : null,
          path: body?.path ? String(body.path).slice(0, 500) : null,
          visitor_id: body?.visitor_id ? String(body.visitor_id).slice(0, 64) : null,
          session_id: body?.session_id ? String(body.session_id).slice(0, 64) : null,
          query: body?.query ? String(body.query).slice(0, 200) : null,
          is_admin: !!body?.is_admin,
          metadata:
            typeof body.metadata === "object" && body.metadata && !Array.isArray(body.metadata)
              ? (body.metadata as Record<string, unknown>)
              : {},
          referrer: body?.referrer ? String(body.referrer).slice(0, 400) : null,
          user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
        };
        const sourceKey = base.session_id ?? base.visitor_id ?? clientKey(request, "anonymous");

        // Search-result impressions arrive as one batch per rendered list, so a
        // page of results costs a single request instead of one per card.
        const slugs: string[] = Array.isArray(body?.business_slugs)
          ? body.business_slugs.filter((s: unknown) => typeof s === "string").slice(0, 60)
          : [];

        if (slugs.length) {
          const supabase = analyticsClient();
          const { data: rows } = await supabase
            .from("businesses")
            .select("id, slug, city")
            .in("slug", slugs);
          const events = (rows ?? []).map((r) => ({
            ...base,
            business_id: r.id,
            city: r.city,
            // One impression per business per browser session, even if the UI re-renders.
            dedupe_key: analyticsDedupeKey(["impression", sourceKey, r.id]),
          }));
          if (events.length) {
            await insertEvents(events);
          }
          return new Response(null, { status: 204 });
        }

        const businessSlug =
          typeof body.business_slug === "string" ? body.business_slug.slice(0, 200) : null;
        const { id: business_id, city } = await businessIdForSlug(businessSlug);

        await insertEvent({
          ...base,
          business_id,
          link_id: typeof body?.link_id === "string" ? body.link_id : null,
          city: typeof body.city === "string" ? body.city.slice(0, 120) : city,
          dedupe_key: analyticsDedupeKey(
            [type, sourceKey, business_id, base.path, base.query, base.platform, base.label],
            type === "page_view" ? 30_000 : type === "heartbeat" ? 60_000 : 2_000,
          ),
        });

        return new Response(null, { status: 204 });
      },
    },
  },
});
