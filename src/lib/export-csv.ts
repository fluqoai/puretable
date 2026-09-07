import type { DashboardData } from "@/lib/analytics.dashboard.types";
import { RANGE_LABELS, type RangeKey } from "@/lib/analytics.ranges";

function safeCell(value: string | number) {
  let text = String(value);
  // Prevent spreadsheet applications from interpreting exported text as a formula.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildBusinessCsv(data: DashboardData, range: RangeKey) {
  const rows: (string | number)[][] = [
    ["الفترة / Period", RANGE_LABELS[range]],
    ["تاريخ الإنشاء / Generated", new Date().toISOString()],
    [],
    [
      "النشاط / Business",
      "المدينة / City",
      "الباقة / Plan",
      "زيارات الصفحة / Page views",
      "نقرات التواصل / Contact clicks",
      "واتساب / WhatsApp",
      "الموقع / Website",
      "الاتصال / Phone",
      "مرات الإضافة للمفضلة / Favorite adds",
      "إجمالي النقرات / Total clicks",
    ],
    ...data.businesses.map((business) => [
      business.name,
      business.city,
      business.plan ?? "free",
      business.views,
      business.contactClicks,
      business.whatsapp ?? 0,
      business.website,
      business.phone,
      business.favorites,
      business.clicks,
    ]),
  ];
  return `\uFEFF${rows.map((row) => row.map(safeCell).join(",")).join("\r\n")}`;
}

export function downloadBusinessCsv(data: DashboardData, range: RangeKey) {
  const blob = new Blob([buildBusinessCsv(data, range)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `pure-table-analytics-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.rel = "noopener";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}
