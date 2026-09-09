import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { ogImageMeta } from "@/lib/seo";
import { Page } from "@/components/site/Layout";
import { usePageView } from "@/hooks/use-page-view";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { track } from "@/lib/track";

export const Route = createFileRoute("/waitlist")({
  // `?src=` lets a pre-launch campaign tag where each sign-up came from.
  validateSearch: (s: Record<string, unknown>) => ({
    src: typeof s["src"] === "string" ? s["src"] : "",
  }),
  head: () => ({
    meta: [
      { title: "قائمة الانتظار — Pure Table Waitlist" },
      {
        name: "description",
        content: "سجّل بريدك لتكون أول من يعرف عند إطلاق بيور تيبل. Join the Pure Table waitlist.",
      },
      { property: "og:title", content: "قائمة الانتظار — Pure Table Waitlist" },
      { property: "og:description", content: "كن أول من يعرف عند إطلاق دليل بيور تيبل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: WaitlistPage,
});

function WaitlistPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const { src } = Route.useSearch();
  usePageView();
  const tallyUrl = "https://tally.so/r/5B7j8E";

  return (
    <Page>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pure Table</p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-tight">
          {ar ? "كن أول من يعرف" : "Be the first to know"}
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          {ar
            ? "سجّل بريدك وسنخبرك فور إطلاق دليل بيور تيبل في مدينتك."
            : "Leave your email and we will tell you the moment Pure Table launches in your city."}
        </p>

        <a
          href={tallyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track({
              event_type: "click_link",
              platform: "tally",
              label: src || "waitlist",
            })
          }
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <ExternalLink className="h-4 w-4" />
          {ar ? "سجّلني" : "Join the waitlist"}
        </a>
      </section>
    </Page>
  );
}
