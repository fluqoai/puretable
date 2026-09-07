import { Page } from "./Layout";
import { useSiteText } from "@/hooks/use-site-settings";
import { usePageView } from "@/hooks/use-page-view";

/**
 * Privacy policy / terms pages. The content itself is written and edited from
 * the admin dashboard (Appearance → texts), so no code change is needed.
 */
export function LegalPage({ titleKey, bodyKey }: { titleKey: string; bodyKey: string }) {
  const { text } = useSiteText();
  usePageView();
  const body = text(bodyKey);
  return (
    <Page>
      <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{text(titleKey)}</h1>
        <div className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">
          {body && body !== bodyKey ? body : text("legal.empty")}
        </div>
      </section>
    </Page>
  );
}
