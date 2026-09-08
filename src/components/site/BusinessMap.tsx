import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import type { Business } from "@/data/businesses";
import { BranchesMap } from "./BranchesMap";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function BusinessMap({ items }: { items: Business[] }) {
  const { lang } = useLanguage();
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Business | null>(null);
  const pins = items.flatMap((business) =>
    business.noLocation
      ? []
      : [
          {
            id: business.id,
            title: business.name_i18n?.[lang] ?? business.name,
            lat: business.lat,
            lng: business.lng,
            business,
          },
          ...(business.branches ?? [])
            .filter((branch) => !branch.permanentlyClosed)
            .map((branch) => ({
              id: branch.id,
              title: `${business.name_i18n?.[lang] ?? business.name} — ${branch.name_i18n?.[lang] ?? branch.name}`,
              lat: branch.lat,
              lng: branch.lng,
              business,
            })),
        ],
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
      <BranchesMap
        points={pins}
        height={500}
        onPointSelect={(id) => setSelected(pins.find((pin) => pin.id === id)?.business ?? null)}
      />
      {selected && (
        <div className="absolute bottom-4 max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] ltr:left-4 rtl:right-4">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2 text-xs text-muted-foreground hover:text-foreground ltr:right-3 rtl:left-3"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex gap-3">
            <img
              src={selected.cover}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold">
                {selected.name_i18n?.[lang] ?? selected.name}
              </h3>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {selected.city_i18n?.[lang] ?? selected.city}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {selected.products_i18n?.[lang] ?? selected.products}
              </p>
            </div>
          </div>
          <Link
            to="/business/$id"
            params={{ id: selected.id }}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            {t("common.view_details")}
          </Link>
        </div>
      )}
    </div>
  );
}
