import { Sparkles } from "lucide-react";
import { useSiteText } from "@/hooks/use-site-settings";
import { LogoMark } from "./Logo";
import { DeveloperCredit } from "./DeveloperCredit";
import { WaitlistForm } from "./WaitlistForm";

/** Shown to visitors while the site is in pre-launch mode. */
export function ComingSoon() {
  const { text, lang } = useSiteText();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <LogoMark className="h-16" />
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Pure Table
      </span>
      <h1 className="mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
        {text("coming_soon.title")}
      </h1>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
        {text("coming_soon.body")}
      </p>
      <div className="mt-8 flex w-full justify-center">
        <WaitlistForm source="coming-soon" language={lang === "ar" ? "ar" : "en"} compact />
      </div>
      <div className="mt-10">
        <DeveloperCredit />
      </div>
    </div>
  );
}
