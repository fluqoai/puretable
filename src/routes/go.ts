// Internal tracked redirect: /go?to=…&type=…&b=slug&link=uuid&platform=…
// Every outbound link on the site goes through here so the click lands in the
// database before the visitor leaves for the external site.
//
// The target is validated first: only known platform domains, contact schemes
// (tel:/mailto:) or a URL that really belongs to the referenced business are
// followed, so the domain can never be used as an open redirect.
import { createFileRoute } from "@tanstack/react-router";
import {
  analyticsDedupeKey,
  insertEvent,
  businessIdForSlug,
  analyticsClient,
} from "@/lib/analytics.server";
import { extractUrl } from "@/lib/link-url";
import { isContactScheme, isKnownHost, matchesStoredHost } from "@/lib/outbound";
import { allow, clientKey } from "@/lib/rate-limit.server";

const CLICK_EVENTS = new Set([
  "click_maps",
  "click_delivery",
  "click_booking",
  "click_whatsapp",
  "click_website",
  "click_phone",
  "click_social",
  "click_link",
]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type LinkedBusiness = {
  city: string | null;
  website: string | null;
  maps_url: string | null;
};

export const Route = createFileRoute("/go")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // Legacy rows can still hold share text around the URL — clean it here
        // instead of failing the redirect with a 400.
        const to = extractUrl(url.searchParams.get("to"));
        if (!to) return new Response("Bad request", { status: 400 });

        const requestedType = (url.searchParams.get("type") || "click_link").slice(0, 40);
        const type = CLICK_EVENTS.has(requestedType) ? requestedType : "click_link";
        const rawLinkId = url.searchParams.get("link");
        const linkId = rawLinkId && UUID.test(rawLinkId) ? rawLinkId : null;
        const slug = url.searchParams.get("b")?.slice(0, 200) ?? null;
        let platform = url.searchParams.get("platform");
        let label = url.searchParams.get("label");

        let business_id: string | null = null;
        let city: string | null = null;
        // URLs stored for this business — used to accept destinations that are
        // not on the fixed platform list (an official restaurant website).
        const storedUrls: (string | null | undefined)[] = [];

        const supabase = analyticsClient();

        if (linkId) {
          const { data: link } = await supabase
            .from("business_links")
            .select(
              "id, url, platform, product_name, business_id, businesses(city, website, maps_url)",
            )
            .eq("id", linkId)
            .maybeSingle();
          if (link) {
            business_id = link.business_id;
            platform = platform ?? link.platform;
            label = label ?? link.product_name;
            const relationship = link.businesses as LinkedBusiness | LinkedBusiness[] | null;
            const biz = Array.isArray(relationship) ? relationship[0] : relationship;
            city = biz?.city ?? null;
            storedUrls.push(link.url, biz?.website, biz?.maps_url);
          }
        }
        if (slug) {
          const { data: biz } = await supabase
            .from("businesses")
            .select("id, city, website, maps_url")
            .eq("slug", slug)
            .maybeSingle();
          if (biz) {
            business_id = business_id ?? biz.id;
            city = city ?? biz.city;
            storedUrls.push(biz.website, biz.maps_url);
            const { data: links } = await supabase
              .from("business_links")
              .select("url")
              .eq("business_id", biz.id);
            for (const l of links ?? []) storedUrls.push(l.url);
          }
        }
        if (!business_id && slug) {
          const found = await businessIdForSlug(slug);
          business_id = found.id;
          city = city ?? found.city;
        }

        const safe = isContactScheme(to) || isKnownHost(to) || matchesStoredHost(to, storedUrls);
        if (!safe) return new Response("Blocked destination", { status: 400 });

        // A visitor cannot realistically click hundreds of outbound links a
        // minute; anything above that is a script inflating the numbers.
        if (allow(clientKey(request, "go"), 120, 60_000)) {
          const visitor = url.searchParams.get("v")?.slice(0, 64) ?? null;
          const session = url.searchParams.get("s")?.slice(0, 64) ?? null;
          await insertEvent({
            event_type: type,
            business_id,
            link_id: linkId,
            platform: platform?.slice(0, 60) ?? null,
            label: label?.slice(0, 200) ?? null,
            path: url.searchParams.get("from")?.slice(0, 500) ?? null,
            visitor_id: visitor,
            session_id: session,
            city,
            is_admin: url.searchParams.get("a") === "1",
            metadata: { to: to.slice(0, 400) },
            referrer: request.headers.get("referer"),
            user_agent: request.headers.get("user-agent")?.slice(0, 400) ?? null,
            dedupe_key: analyticsDedupeKey(
              [
                "outbound",
                type,
                session ?? visitor ?? clientKey(request, "anonymous"),
                business_id,
                linkId,
                to,
              ],
              2_000,
            ),
          });
        }

        return new Response(null, { status: 302, headers: { Location: to } });
      },
    },
  },
});
