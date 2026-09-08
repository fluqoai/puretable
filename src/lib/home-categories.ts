import type { Business } from "@/data/businesses";
import { discoverBusinesses, hasCategory } from "./discovery";

/** Bound homepage rendering independently of the number of places in a category. */
export function categoryPreviews<T extends { value: string }>(
  businesses: Business[],
  categories: T[],
) {
  const ordered = discoverBusinesses(businesses).map(({ business }) => business);
  return categories.map((category) => {
    const matches = ordered.filter((business) => hasCategory(business, category.value));
    return { category, count: matches.length, preview: matches.slice(0, 3) };
  });
}
