/**
 * Single source of truth for the site filters (categories).
 *
 * Adding one entry here automatically adds the filter to:
 *  - the header ("More" dropdown when it is not a primary tab)
 *  - the "Categories" section on the homepage
 *  - the admin category picker
 */
import {
  UtensilsCrossed, Coffee, Cookie, CakeSlice, Home as HomeIcon, ShoppingCart,
  type LucideIcon,
} from "lucide-react";

import type { Category } from "@/data/businesses";

export type CategoryDef = {
  value: Category;
  path: string;
  /** i18n key for the label (nav.*) and the homepage card description (categories.*) */
  navKey: string;
  descKey: string;
  icon: LucideIcon;
  /** Primary filters get their own tab in the header; the rest live under "More". */
  primary?: boolean;
};

export const CATEGORY_DEFS: CategoryDef[] = [
  { value: "restaurant", path: "/restaurants", navKey: "nav.restaurants", descKey: "categories.restaurants_desc", icon: UtensilsCrossed, primary: true },
  { value: "cafe", path: "/cafes", navKey: "nav.cafes", descKey: "categories.cafes_desc", icon: Coffee, primary: true },
  { value: "bakery", path: "/bakeries", navKey: "nav.bakeries", descKey: "categories.bakeries_desc", icon: Cookie, primary: true },
  { value: "dessert", path: "/desserts", navKey: "nav.desserts", descKey: "categories.desserts_desc", icon: CakeSlice },
  { value: "home", path: "/home-businesses", navKey: "nav.home_businesses", descKey: "categories.home_desc", icon: HomeIcon },
  { value: "supermarket", path: "/supermarkets", navKey: "nav.supermarkets", descKey: "categories.supermarkets_desc", icon: ShoppingCart },
];


export const PRIMARY_CATEGORIES = CATEGORY_DEFS.filter((c) => c.primary);
export const SECONDARY_CATEGORIES = CATEGORY_DEFS.filter((c) => !c.primary);
