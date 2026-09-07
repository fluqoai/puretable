import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { LegalPage } from "@/components/site/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Pure Table" },
      { name: "description", content: "How Pure Table collects, uses and protects information on its gluten-free directory." },
      { property: "og:title", content: "Privacy Policy — Pure Table" },
      { property: "og:description", content: "How Pure Table collects, uses and protects information on its gluten-free directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: () => <LegalPage titleKey="legal.privacy_title" bodyKey="legal.privacy_body" />,
});
