/** Runtime registry for the two admin-managed category levels. */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Bike,
  CakeSlice,
  CalendarCheck,
  Coffee,
  Cookie,
  Home as HomeIcon,
  MapPin,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  CATEGORY_CATALOG_KEY,
  listPlaceCategories,
  type CategoryBehavior,
  type CategoryLevel,
  type PlaceCategory,
} from "@/lib/category.functions";

export type FilterEntry = {
  id: string;
  value: string;
  slug: string;
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
  level: CategoryLevel;
  behavior: CategoryBehavior;
  primary: boolean;
  custom: boolean;
  visible: boolean;
  order: number;
};

const ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  calendar: CalendarCheck,
  star: Star,
  "map-pin": MapPin,
  truck: Bike,
  "shopping-bag": ShoppingBag,
  utensils: UtensilsCrossed,
  coffee: Coffee,
  cookie: Cookie,
  cake: CakeSlice,
  home: HomeIcon,
  "shopping-cart": ShoppingCart,
};

/** Keeps the first render useful while the catalogue request is loading. */
export const DEFAULT_PLACE_CATEGORIES: PlaceCategory[] = [
  {
    id: "default-near",
    value: "near_me",
    slug: "near-me",
    name_ar: "بالقرب مني",
    name_en: "Near me",
    description_ar: "اعثر على الخيارات الأقرب لموقعك",
    description_en: "Find options closest to your location",
    level: "main",
    behavior: "nearby",
    icon: "map-pin",
    visible: true,
    sort_order: 10,
  },
  {
    id: "default-book",
    value: "svc_dine_in",
    slug: "dine-in",
    name_ar: "احجز طاولتك",
    name_en: "Book a table",
    description_ar: "أماكن توفر حجز الطاولات",
    description_en: "Places that offer table booking",
    level: "main",
    behavior: "booking",
    icon: "calendar",
    visible: true,
    sort_order: 20,
  },
  {
    id: "default-featured",
    value: "featured",
    slug: "featured",
    name_ar: "أماكن مميزة",
    name_en: "Featured places",
    description_ar: "اختيارات مميزة من بيور تيبل",
    description_en: "Featured Pure Table picks",
    level: "main",
    behavior: "featured",
    icon: "star",
    visible: true,
    sort_order: 30,
  },
  {
    id: "default-restaurant",
    value: "restaurant",
    slug: "restaurants",
    name_ar: "مطاعم",
    name_en: "Restaurants",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "utensils",
    visible: true,
    sort_order: 10,
  },
  {
    id: "default-cafe",
    value: "cafe",
    slug: "cafes",
    name_ar: "مقاهي",
    name_en: "Cafes",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "coffee",
    visible: true,
    sort_order: 20,
  },
  {
    id: "default-bakery",
    value: "bakery",
    slug: "bakeries",
    name_ar: "مخابز",
    name_en: "Bakeries",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "cookie",
    visible: true,
    sort_order: 30,
  },
  {
    id: "default-dessert",
    value: "dessert",
    slug: "desserts",
    name_ar: "حلويات",
    name_en: "Desserts",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "cake",
    visible: true,
    sort_order: 40,
  },
  {
    id: "default-home",
    value: "home",
    slug: "home-businesses",
    name_ar: "أسر منتجة",
    name_en: "Home businesses",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "home",
    visible: true,
    sort_order: 50,
  },
  {
    id: "default-supermarket",
    value: "supermarket",
    slug: "supermarkets",
    name_ar: "سوبرماركت",
    name_en: "Supermarkets",
    description_ar: "",
    description_en: "",
    level: "sub",
    behavior: "manual",
    icon: "shopping-cart",
    visible: true,
    sort_order: 60,
  },
];

const BUILT_IN_PATHS: Record<string, string> = {
  restaurant: "/restaurants",
  cafe: "/cafes",
  bakery: "/bakeries",
  dessert: "/desserts",
  home: "/home-businesses",
  supermarket: "/supermarkets",
};

export function categoryPath(category: Pick<PlaceCategory, "value" | "slug" | "behavior">) {
  if (category.behavior === "nearby") return "#near-me";
  if (category.behavior === "featured") return "/featured";
  if (category.behavior === "booking") return "/s/dine-in";
  if (category.value.startsWith("svc_")) return `/s/${category.slug}`;
  return BUILT_IN_PATHS[category.value] ?? `/c/${category.slug}`;
}

export function useFilters(): {
  all: FilterEntry[];
  visible: FilterEntry[];
  main: FilterEntry[];
  secondary: FilterEntry[];
} {
  const { lang } = useLanguage();
  const load = useServerFn(listPlaceCategories);
  const { data } = useQuery({
    queryKey: CATEGORY_CATALOG_KEY,
    queryFn: () => load(),
    staleTime: 60_000,
  });
  const rows = data?.length ? data : DEFAULT_PLACE_CATEGORIES;
  const all = [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      id: category.id,
      value: category.value,
      slug: category.slug,
      path: categoryPath(category),
      label:
        lang === "ar" ? category.name_ar || category.name_en : category.name_en || category.name_ar,
      description:
        lang === "ar"
          ? category.description_ar || category.description_en
          : category.description_en || category.description_ar,
      icon: ICONS[category.icon] ?? Sparkles,
      level: category.level,
      behavior: category.behavior,
      primary: category.level === "main",
      custom: category.value.startsWith("cf_"),
      visible: category.visible,
      order: category.sort_order,
    }));
  const visible = all.filter((category) => category.visible);
  return {
    all,
    visible,
    main: visible.filter((category) => category.level === "main"),
    secondary: visible.filter((category) => category.level === "sub"),
  };
}
