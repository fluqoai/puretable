import assert from "node:assert/strict";
import test from "node:test";
import { buildBusinessCsv } from "./export-csv";
import { buildImagePdf } from "./export-pdf";
import type { DashboardData } from "./analytics.dashboard.types";

const dashboard = {
  businesses: [
    {
      id: "1",
      name: "=Formula Place",
      slug: "place",
      city: "Riyadh",
      plan: "premium",
      views: 12,
      maps: 1,
      delivery: 0,
      booking: 0,
      whatsapp: 3,
      website: 2,
      phone: 1,
      social: 0,
      other: 0,
      clicks: 7,
      contactClicks: 6,
      favorites: 4,
    },
  ],
} as DashboardData;

test("CSV is Google Sheets compatible and neutralizes formula-like names", () => {
  const csv = buildBusinessCsv(dashboard, "30d");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /'=Formula Place/);
  assert.match(csv, /"premium","12","6"/);
});

test("image PDF builder emits a complete multi-page PDF", () => {
  const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = buildImagePdf([
    { bytes: jpeg, width: 1, height: 1 },
    { bytes: jpeg, width: 1, height: 1 },
  ]);
  const text = new TextDecoder("latin1").decode(pdf);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.match(text, /\/Count 2/);
  assert.ok(text.endsWith("%%EOF\n"));
});
