import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Pure Table" },
      { name: "description", content: "The terms that apply when using the Pure Table gluten-free directory." },
      { property: "og:title", content: "Terms & Conditions — Pure Table" },
      { property: "og:description", content: "The terms that apply when using the Pure Table gluten-free directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: () => <LegalPage titleKey="legal.terms_title" bodyKey="legal.terms_body" />,
});
