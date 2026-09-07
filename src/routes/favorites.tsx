import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/site/Layout";
import { BusinessCard } from "@/components/site/BusinessCard";
import { listBusinesses } from "@/lib/businesses.public.functions";
import { useFavoriteIds } from "@/lib/favorites";
import { usePageView } from "@/hooks/use-page-view";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Saved Places — Pure Table" },
      { name: "description", content: "The gluten-free places you saved to your Pure Table account." },
      { property: "og:title", content: "Saved Places — Pure Table" },
      { property: "og:description", content: "The gluten-free places you saved to your Pure Table account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { t } = useTranslation();
  usePageView();
  const { userId, ids } = useFavoriteIds();
  const { data: businesses = [] } = useQuery({ queryKey: ["businesses"], queryFn: () => listBusinesses() });
  const items = businesses.filter((b) => b.dbId && ids.has(b.dbId));

  return (
    <Page>
      <section className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold">{t("favorites.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("favorites.subtitle")}</p>
        {!userId ? (
          <Link
            to="/auth"
            search={{ next: "/favorites" }}
            className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {t("favorites.sign_in")}
          </Link>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">{t("favorites.empty")}</p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((b) => (
              <BusinessCard key={b.id} b={b} />
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
