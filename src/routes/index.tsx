import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, CalendarCheck, Bike, ShoppingBag, Navigation, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import { Page } from "@/components/site/Layout";
import { BusinessCard } from "@/components/site/BusinessCard";
import { categoryPreviews } from "@/lib/home-categories";
import { useFilters } from "@/lib/filters";
import { listBusinesses } from "@/lib/businesses.public.functions";
import { usePageView } from "@/hooks/use-page-view";
import { useSiteText } from "@/hooks/use-site-settings";
import { track } from "@/lib/track";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pure Table — Gluten-Free Directory in Saudi Arabia" },
      {
        name: "description",
        content:
          "Discover trusted restaurants, cafes, bakeries, and home businesses offering safe gluten-free options across Saudi Arabia.",
      },
      { property: "og:title", content: "Pure Table — Gluten-Free Directory in Saudi Arabia" },
      {
        property: "og:description",
        content:
          "Discover trusted restaurants, cafes, bakeries, and home businesses offering safe gluten-free options across Saudi Arabia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
      { property: "og:url", content: "https://puretable.co/" },
    ],
    links: [{ rel: "canonical", href: "https://puretable.co/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://puretable.co/#organization",
              name: "Pure Table",
              url: "https://puretable.co/",
              description:
                "Gluten-free directory helping people with celiac disease find safe places to eat in Saudi Arabia.",
              areaServed: { "@type": "Country", name: "Saudi Arabia" },
            },
            {
              "@type": "WebSite",
              "@id": "https://puretable.co/#website",
              name: "Pure Table",
              url: "https://puretable.co/",
              inLanguage: ["ar", "en"],
              publisher: { "@id": "https://puretable.co/#organization" },
            },
          ],
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { text, shows, loc, layout, lang } = useSiteText();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  usePageView();

  const {
    data: businesses = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
  });

  // Categories come from the shared filter registry (built-in + admin-created);
  // each one can be hidden from the dashboard.
  const { visible: categories } = useFilters();
  const groups = categoryPreviews(businesses, categories);

  function findNearby() {
    track({ event_type: "filter_click", platform: "main", label: "near_me" });
    navigate({ to: "/search", search: { near: true } });
  }

  const cards = layout.cards.filter((c) => c.visible !== false);
  const heroImage = layout.media["hero"] || heroImg;

  /* Each homepage section is rendered by key so the admin can reorder them. */
  const builtIn: Record<string, () => React.ReactNode> = {
    hero_image: () => (
      <section key="hero" className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pt-16">
          <div className="flex flex-col justify-center">
            {shows("home_badge") && (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" /> {text("home.badge")}
              </span>
            )}
            <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
              {text("home.title_1")}
              <br />
              <span className="text-primary">{text("home.title_2")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">{text("home.subtitle")}</p>
          </div>
          {layout.media["hero"] !== "none" && (
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-primary/10 blur-2xl"
                aria-hidden
              />
              <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--shadow-elevated)]">
                <img
                  src={heroImage}
                  alt={text("home.title_1")}
                  width={1600}
                  height={1200}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    ),

    hero_search: () => (
      <section key="search" className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            track({ event_type: "search", query: q });
            navigate({ to: "/search", search: { q } });
          }}
          className="flex w-full items-center gap-2 rounded-full border border-border bg-card p-2 shadow-[var(--shadow-soft)]"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 ps-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={text("home.search_placeholder")}
              className="w-full min-w-0 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {text("home.search")}
          </button>
        </form>
      </section>
    ),

    home_quick_actions: () => (
      <section key="quick" className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cards.map((c) => {
            const isNear = c.href === "#near-me";
            const Icon = CARD_ICONS[c.id] ?? Sparkles;
            const inner = (
              <>
                <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-primary-soft text-primary">
                  {c.image ? (
                    <img src={c.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-6 w-6" />
                  )}
                </span>
                <span className="font-display text-sm font-semibold leading-tight">
                  {loc(c.title)}
                </span>
                <span className="text-[11px] text-muted-foreground">{loc(c.sub)}</span>
              </>
            );
            const cls =
              "flex flex-col items-center gap-2 rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40";
            return isNear ? (
              <button key={c.id} type="button" onClick={findNearby} className={cls}>
                {inner}
              </button>
            ) : (
              <a
                key={c.id}
                href={c.href}
                onClick={() => track({ event_type: "filter", label: c.id })}
                className={cls}
              >
                {inner}
              </a>
            );
          })}
        </div>
      </section>
    ),

    home_discover: () => (
      <section key="discover" className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold">{text("home.discover")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{text("home.discover_sub")}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.path}
              to={c.path}
              onClick={() =>
                track({
                  event_type: "filter_click",
                  platform: c.primary ? "main" : "secondary",
                  label: c.value,
                })
              }
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <c.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-sm font-semibold">{c.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),

    home_nearest: () => (
      <section
        key="nearest"
        id="nearby"
        className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 lg:px-8"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold">{text("home.nearest")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text("home.nearest_sub")}</p>
          </div>
          <button
            onClick={findNearby}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-70"
          >
            <Navigation className="h-3.5 w-3.5" />
            {text("home.enable_location")}
          </button>
        </div>
      </section>
    ),

    home_all_places: () => (
      <section key="all" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="font-display text-2xl font-semibold">
          {lang === "ar" ? "تصفّح الأماكن حسب النوع" : "Browse places by category"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ar"
            ? "اختر القسم الذي يناسبك، أو شاهد جميع أماكنه دون إطالة الصفحة الرئيسية."
            : "Choose a category and explore its full directory."}
        </p>
        <nav
          aria-label={lang === "ar" ? "أقسام الأماكن" : "Place categories"}
          className="mt-5 flex flex-wrap gap-2"
        >
          {groups.map(({ category, count }) => (
            <Link
              key={category.value}
              to={category.path}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary focus-visible:outline-primary"
            >
              <category.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {category.label}
              {!isLoading && !error && (
                <span className="text-xs text-muted-foreground">({count})</span>
              )}
            </Link>
          ))}
        </nav>
        {isLoading ? (
          <p role="status" className="mt-6">
            {lang === "ar" ? "جارٍ تحميل الأقسام…" : "Loading categories…"}
          </p>
        ) : error ? (
          <div role="alert" className="mt-6 text-sm">
            <p>{lang === "ar" ? "تعذر تحميل الأماكن." : "Could not load places."}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-primary underline"
            >
              {lang === "ar" ? "إعادة المحاولة" : "Try again"}
            </button>
          </div>
        ) : businesses.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">{text("home.no_places")}</p>
        ) : (
          <div className="mt-8 space-y-12">
            {groups
              .filter((group) => group.count > 0)
              .map(({ category, count, preview }) => (
                <section key={category.value} aria-labelledby={`home-category-${category.value}`}>
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <h3
                      id={`home-category-${category.value}`}
                      className="flex items-center gap-2 font-display text-xl font-semibold"
                    >
                      <category.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                      {category.label}
                    </h3>
                    <Link
                      to={category.path}
                      aria-label={`${lang === "ar" ? "عرض كل" : "View all"} ${category.label}`}
                      className="shrink-0 rounded-full border border-primary/30 px-4 py-2 text-sm text-primary hover:bg-primary-soft"
                    >
                      {lang === "ar" ? "عرض الكل" : "View all"} ({count})
                    </Link>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {preview.map((business) => (
                      <BusinessCard key={business.id} b={business} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        )}
      </section>
    ),
  };

  return (
    <Page>
      {layout.order.map((key) => {
        if (!shows(key)) return null;
        const render = builtIn[key];
        if (render) return <div key={key}>{render()}</div>;
        const block = layout.blocks.find((b) => b.id === key);
        if (!block) return null;
        return (
          <section key={key} className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
              {block.image && (
                <img
                  src={block.image}
                  alt=""
                  className="mb-5 h-52 w-full rounded-2xl object-cover"
                />
              )}
              {loc(block.title) && (
                <h2 className="font-display text-2xl font-semibold">{loc(block.title)}</h2>
              )}
              {loc(block.body) && (
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                  {loc(block.body)}
                </p>
              )}
              {block.buttons.filter((b) => b.visible !== false).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {block.buttons
                    .filter((b) => b.visible !== false)
                    .map((b) => (
                      <a
                        key={b.id}
                        href={b.href || "#"}
                        className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                      >
                        {loc(b.label)}
                      </a>
                    ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </Page>
  );
}

const CARD_ICONS: Record<string, typeof CalendarCheck> = {
  book: CalendarCheck,
  delivery: Bike,
  pickup: ShoppingBag,
  near: Navigation,
  featured: Sparkles,
};
