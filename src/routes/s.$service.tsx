import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { CategoryPage } from "@/components/site/CategoryPage";
import { listBusinesses } from "@/lib/businesses.public.functions";
import { hasCategory } from "@/data/businesses";
import { canBook, serviceBySlug } from "@/lib/services";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export const Route = createFileRoute("/s/$service")({
  head: () => ({
    meta: [
      { title: "Gluten-Free Places by Service — Pure Table" },
      {
        name: "description",
        content: "Find gluten-free places in Saudi Arabia for dining in, delivery or pickup.",
      },
      { property: "og:title", content: "Gluten-Free Places by Service — Pure Table" },
      {
        property: "og:description",
        content: "Find gluten-free places in Saudi Arabia for dining in, delivery or pickup.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: ServicePage,
});

function ServicePage() {
  const { service } = Route.useParams();
  const { lang } = useLanguage();
  const def = serviceBySlug(service);
  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
  });

  return (
    <CategoryPage
      eyebrow="Pure Table"
      title={def ? (lang === "ar" ? def.ar : def.en) : service}
      description=""
      items={
        def
          ? def.slug === "dine-in"
            ? businesses.filter(canBook)
            : businesses.filter((b) => hasCategory(b, def.value))
          : []
      }
      initialBookingOnly={def?.slug === "dine-in"}
    />
  );
}
