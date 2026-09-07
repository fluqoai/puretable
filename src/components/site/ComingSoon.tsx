
import { Sparkles } from "lucide-react";
import { useSiteText } from "@/hooks/use-site-settings";
import { LogoMark } from "./Logo";

/** Shown to visitors while the site is in pre-launch mode. */
export function ComingSoon() {
  const { text } = useSiteText();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <LogoMark className="h-16" />
      <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Pure Table
      </span>
      <h1 className="mt-5 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-4xl">
        {text("coming_soon.title")}
      </h1>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">{text("coming_soon.body")}</p>
      <a
        href="https://tally.so/r/5B7j8E"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:opacity-90"
      >
        {text("coming_soon.cta")}
      </a>
    </div>
  );
}
