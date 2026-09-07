import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CategoryPage } from "@/components/site/CategoryPage";
import { listBusinesses } from "@/lib/businesses.public.functions";

type SearchParams = { q?: string; near?: boolean; premium?: boolean; booking?: boolean };

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Gluten-Free Places — Pure Table" },
      {
        name: "description",
        content:
          "Search gluten-free restaurants, cafes, bakeries and home businesses across Saudi Arabia.",
      },
      { property: "og:title", content: "Search Gluten-Free Places — Pure Table" },
      { property: "og:description", content: "Find celiac-safe places by name, city or product." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s["q"] === "string" ? s["q"] : undefined,
    near: s["near"] === true || s["near"] === "1",
    premium: s["premium"] === true || s["premium"] === "1",
    booking: s["booking"] === true || s["booking"] === "1",
  }),
  component: SearchPage,
});

function SearchPage() {
  const { t } = useTranslation();
  const { q = "", near = false, premium = false, booking = false } = Route.useSearch();
  const { data = [] } = useQuery({ queryKey: ["businesses"], queryFn: () => listBusinesses() });
  return (
    <CategoryPage
      eyebrow={t("home.search")}
      title={q ? `${t("home.search")}: ${q}` : t("home.search")}
      description={t("filters.search_help")}
      items={data}
      initialQuery={q}
      initialPremiumOnly={premium}
      initialBookingOnly={booking}
      requestNearbyOnMount={near}
    />
  );
}
