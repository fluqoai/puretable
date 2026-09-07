import { useTranslation } from "react-i18next";
import type { SafetyLevel } from "@/data/businesses";

/**
 * green = 100% dedicated gluten-free / celiac safe.
 * red   = gluten-free options available, customer must confirm with staff.
 * none  = no rating shown at all (chosen per business in the admin).
 */
export function SafetyDot({ level, className = "" }: { level: SafetyLevel; className?: string }) {
  if (level === "none") return null;
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${level === "green" ? "bg-safety-safe" : "bg-safety-caution"} ${className}`}
    />
  );
}

export function SafetyBadge({ level, size = "sm" }: { level: SafetyLevel; size?: "sm" | "md" }) {
  const { t } = useTranslation();
  if (level === "none") return null;
  const safe = level === "green";
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border bg-background/90 font-medium backdrop-blur ${
        safe ? "border-safety-safe/40 text-safety-safe" : "border-safety-caution/40 text-safety-caution"
      } ${size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]"}`}
    >
      <SafetyDot level={level} />
      {t(safe ? "safety.safe_label" : "safety.caution_label")}
    </span>
  );
}

/** Orange dot shown when the place cooks in a kitchen shared with gluten. */
export function SharedKitchenBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border border-safety-shared/40 bg-background/90 font-medium text-safety-shared backdrop-blur ${
        size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]"
      }`}
    >
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-safety-shared" />
      {t("safety.shared_label")}
    </span>
  );
}

export function SafetyNote({
  level,
  sharedKitchen = false,
  precautionsNote,
  disclaimerHref = "#disclaimer",
}: {
  level: SafetyLevel;
  sharedKitchen?: boolean;
  precautionsNote?: string | null;
  /** Where the "read the disclaimer" link points (anchor on the business page). */
  disclaimerHref?: string;
}) {
  const { t } = useTranslation();
  const safe = level === "green";
  return (
    <div className="space-y-3">
      {level !== "none" && (
        <div
          className={`rounded-2xl border p-4 ${
            safe ? "border-safety-safe/30 bg-safety-safe/5" : "border-safety-caution/30 bg-safety-caution/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <SafetyDot level={level} />
            <span className={`text-sm font-semibold ${safe ? "text-safety-safe" : "text-safety-caution"}`}>
              {t(safe ? "safety.safe_label" : "safety.caution_label")}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t(safe ? "safety.safe_desc" : "safety.caution_desc")}
          </p>
        </div>
      )}
      {sharedKitchen && (
        <div className="rounded-2xl border border-safety-shared/30 bg-safety-shared/5 p-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-safety-shared" />
            <span className="text-sm font-semibold text-safety-shared">{t("safety.shared_label")}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {precautionsNote?.trim() || t("safety.shared_desc")}
          </p>
        </div>
      )}
      {/* The caveat is never shown without a way to read the full disclaimer. */}
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("safety.source_note")}{" "}
        <a href={disclaimerHref} className="font-medium text-primary underline underline-offset-2">
          {t("safety.see_disclaimer")}
        </a>
      </p>
    </div>
  );
}

