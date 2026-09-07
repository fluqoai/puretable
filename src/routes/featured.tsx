import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ogImageMeta } from "@/lib/seo";
import { CategoryPage } from "@/components/site/CategoryPage";
import { listBusinesses } from "@/lib/businesses.public.functions";
import { isFeatured } from "@/lib/services";

export const Route = createFileRoute("/featured")({
  head: () => ({
    meta: [
      { title: "Featured Gluten-Free Places — Pure Table" },
      {
        name: "description",
        content: "A handpicked selection of trusted gluten-free places across Saudi Arabia.",
      },
      { property: "og:title", content: "Featured Gluten-Free Places — Pure Table" },
      {
        property: "og:description",
        content: "A handpicked selection of trusted gluten-free places across Saudi Arabia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: FeaturedPage,
});

function FeaturedPage() {
  const { t } = useTranslation();
  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
  });
  return (
    <CategoryPage
      eyebrow="Pure Table"
      title={t("featured.title")}
      description={t("featured.subtitle")}
      items={businesses.filter(isFeatured)}
      initialPremiumOnly
    />
  );
}
