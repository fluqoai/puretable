import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { CategoryPage } from "@/components/site/CategoryPage";
import { listBusinesses } from "@/lib/businesses.public.functions";
import { hasCategory } from "@/data/businesses";
import { customFilterValue, useFilters } from "@/lib/filters";

export const Route = createFileRoute("/c/$slug")({
  head: () => ({
    meta: [
      { title: "Gluten-Free Places — Pure Table" },
      { name: "description", content: "Browse gluten-free places in Saudi Arabia by category on Pure Table." },
      { property: "og:title", content: "Gluten-Free Places — Pure Table" },
      { property: "og:description", content: "Browse gluten-free places in Saudi Arabia by category on Pure Table." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: CustomFilterPage,
});

function CustomFilterPage() {
  const { slug } = Route.useParams();
  const value = customFilterValue(slug);
  const { all } = useFilters();
  const entry = all.find((f) => f.value === value);
  const { data: businesses = [] } = useQuery({ queryKey: ["businesses"], queryFn: () => listBusinesses() });

  return (
    <CategoryPage
      eyebrow="Pure Table"
      title={entry?.label ?? slug}
      description=""
      items={businesses.filter((b) => hasCategory(b, value))}
    />
  );
}
