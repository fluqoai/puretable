import { createFileRoute, Link } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { Leaf, ShieldCheck, HeartHandshake, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Page } from "@/components/site/Layout";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Pure Table — Our Gluten-Free Mission" },
      { name: "description", content: "Pure Table helps people with celiac disease and gluten intolerance dine safely across Saudi Arabia." },
      { property: "og:title", content: "About Pure Table" },
      { property: "og:description", content: "Our mission is to make gluten-free dining safe, simple, and beautiful in Saudi Arabia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: About,
});

function About() {
  const { t } = useTranslation();
  return (
    <Page>
      <section className="border-b border-border/60 bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-medium text-primary">
            <Leaf className="h-3.5 w-3.5" /> {t("about.eyebrow")}
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-tight sm:text-6xl">{t("about.title")}</h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">{t("about.subtitle")}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t("about.mission_title")}</h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{t("about.mission_p1")}</p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{t("about.mission_p2")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: ShieldCheck, title: t("about.value_1_t"), body: t("about.value_1_b") },
            { icon: HeartHandshake, title: t("about.value_2_t"), body: t("about.value_2_b") },
            { icon: Sparkles, title: t("about.value_3_t"), body: t("about.value_3_b") },
            { icon: Leaf, title: t("about.value_4_t"), body: t("about.value_4_b") },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary">
                <v.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold">{v.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-secondary/40 p-8 text-center sm:p-14">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{t("about.feature_cta_t")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">{t("about.feature_cta_b")}</p>
          <Link to="/contact" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            {t("common.get_in_touch")}
          </Link>
        </div>
      </section>
    </Page>
  );
}
