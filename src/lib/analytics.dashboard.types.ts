import type { RangeKey } from "@/lib/analytics.ranges";

/** Shape returned by the `admin_dashboard` SQL aggregation (unchanged fields). */
export type DashboardData = {
  range: RangeKey;
  visitors: {
    online: number;
    today: number;
    week: number;
    month: number;
    quarter: number;
    allTime: number;
    inRange: number;
  };
  totals: {
    pageViews: number;
    businessPageViews: number;
    clicks: number;
    uniqueVisitors: number;
    sessions: number;
  };
  businesses: {
    id: string;
    name: string;
    slug: string;
    city: string;
    plan?: string;
    views: number;
    impressions?: number;
    booking?: number;
    whatsapp?: number;
    maps: number;
    delivery: number;
    website: number;
    phone: number;
    social: number;
    other: number;
    contactClicks: number;
    favorites: number;
    clicks: number;
  }[];
  deliveryLinks: {
    id: string;
    count: number;
    platform: string;
    product: string | null;
    url: string;
    business: string;
  }[];
  filters: { label: string; count: number }[];
  mainFilters: { label: string; count: number }[];
  secondaryFilters: { label: string; count: number }[];
  searches: { term: string; count: number }[];
  platforms: { platform: string; count: number }[];
  cities: { city: string; count: number }[];
  timeseries: { date: string; views: number; clicks: number }[];
};
