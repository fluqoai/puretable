/**
 * Runtime filter registry.
 *
 * Built-in filters come from `CATEGORY_DEFS`; admins can add extra filters
 * (main or secondary) from the dashboard — those are stored in
 * `site_settings.layout.filters` and rendered at `/c/<slug>` automatically.
 */
import { Tag, type LucideIcon } from "lucide-react";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useSiteText } from "@/hooks/use-site-settings";
import type { SiteFilter } from "@/lib/site-settings";

export type FilterEntry = {
  /** Value stored on the business row (`restaurant`, `cf_juice-bars`, …). */
  value: string;
  path: string;
  label: string;
  icon: LucideIcon;
  primary: boolean;
  custom: boolean;
  visible: boolean;
};

export function customFilterValue(slug: string) {
  return `cf_${slug}`;
}

/** All filters, in display order, with the admin visibility already applied. */
export function useFilters(): { all: FilterEntry[]; visible: FilterEntry[] } {
  const { text, shows, lang, layout } = useSiteText();

  const builtIn: FilterEntry[] = CATEGORY_DEFS.map((c) => ({
    value: c.value,
    path: c.path,
    label: text(c.navKey),
    icon: c.icon,
    primary: !!c.primary,
    custom: false,
    visible: shows(`cat_${c.value}`),
  }));

  const custom: FilterEntry[] = [...(layout.filters ?? [])]
    .sort((a: SiteFilter, b: SiteFilter) => a.order - b.order)
    .map((f) => ({
      value: customFilterValue(f.slug),
      path: `/c/${f.slug}`,
      label: (lang === "ar" ? f.name_ar || f.name_en : f.name_en || f.name_ar) || f.slug,
      icon: Tag,
      primary: f.primary,
      custom: true,
      visible: f.visible,
    }));

  const all = [...builtIn, ...custom].sort((a, b) => Number(b.primary) - Number(a.primary));
  return { all, visible: all.filter((f) => f.visible) };
}
