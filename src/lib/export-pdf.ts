import type { DashboardData } from "@/lib/analytics.dashboard.types";
import { RANGE_LABELS, type RangeKey } from "@/lib/analytics.ranges";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1754;
const ROWS_PER_PAGE = 21;

type PdfBusinessRow = Pick<
  DashboardData["businesses"][number],
  "name" | "plan" | "views" | "contactClicks" | "favorites"
>;
type PdfSummary = {
  pageViews: number;
  businessPageViews: number;
  contactClicks: number;
  favorites: number;
};

const encoder = new TextEncoder();

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

/** Build a standards-compliant PDF whose pages are high-resolution JPEG images. */
export function buildImagePdf(images: { bytes: Uint8Array; width: number; height: number }[]) {
  if (!images.length) throw new Error("PDF requires at least one page.");
  const objectCount = 2 + images.length * 3;
  const objects = new Map<number, Uint8Array>();
  const pageRefs: string[] = [];

  images.forEach((image, index) => {
    const pageObject = 3 + index * 3;
    const imageObject = pageObject + 1;
    const contentObject = pageObject + 2;
    pageRefs.push(`${pageObject} 0 R`);
    objects.set(
      pageObject,
      encoder.encode(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /XObject << /Report ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`,
      ),
    );
    objects.set(
      imageObject,
      concatBytes([
        encoder.encode(
          `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
        ),
        image.bytes,
        encoder.encode("\nendstream"),
      ]),
    );
    const content = `q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /Report Do Q`;
    objects.set(
      contentObject,
      encoder.encode(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`),
    );
  });
  objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(
    2,
    encoder.encode(`<< /Type /Pages /Count ${images.length} /Kids [${pageRefs.join(" ")}] >>`),
  );

  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let cursor = chunks[0]!.length;
  for (let number = 1; number <= objectCount; number++) {
    const object = objects.get(number);
    if (!object) throw new Error(`Missing PDF object ${number}.`);
    const prefix = encoder.encode(`${number} 0 obj\n`);
    const suffix = encoder.encode("\nendobj\n");
    offsets[number] = cursor;
    chunks.push(prefix, object, suffix);
    cursor += prefix.length + object.length + suffix.length;
  }
  const xrefOffset = cursor;
  const xref = [
    `xref\n0 ${objectCount + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join("");
  chunks.push(encoder.encode(xref));
  return concatBytes(chunks);
}

function pageCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز صفحة PDF في هذا المتصفح.");
  context.direction = "rtl";
  context.textAlign = "right";
  context.textBaseline = "middle";
  return { canvas, context };
}

function text(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 25,
  weight = 400,
  color = "#24332c",
) {
  context.fillStyle = color;
  context.font = `${weight} ${size}px Arial, "Noto Sans Arabic", sans-serif`;
  context.fillText(value, x, y);
}

function drawHeader(
  context: CanvasRenderingContext2D,
  range: RangeKey,
  page: number,
  pages: number,
) {
  context.fillStyle = "#f7f4ed";
  context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.fillStyle = "#315f4d";
  context.fillRect(0, 0, CANVAS_WIDTH, 18);
  text(context, "تقرير تحليلات Pure Table", 1160, 80, 42, 700, "#1f3f33");
  text(context, RANGE_LABELS[range], 1160, 130, 24, 400, "#66736d");
  context.textAlign = "left";
  text(context, `صفحة ${page} من ${pages}`, 80, 88, 20, 400, "#66736d");
  text(context, new Date().toLocaleString("ar-SA"), 80, 130, 20, 400, "#66736d");
  context.textAlign = "right";
}

function drawSummary(context: CanvasRenderingContext2D, summary: PdfSummary) {
  const cards = [
    ["مشاهدات الصفحات", summary.pageViews],
    ["زيارات صفحات الأنشطة", summary.businessPageViews],
    ["نقرات التواصل", summary.contactClicks],
    ["الإضافات للمفضلة", summary.favorites],
  ] as const;
  cards.forEach(([label, value], index) => {
    const width = 260;
    const x = 1160 - index * 280 - width;
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#dce4df";
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, 175, width, 125, 18);
    context.fill();
    context.stroke();
    text(context, label, x + width - 20, 215, 20, 400, "#66736d");
    text(context, value.toLocaleString("ar-SA"), x + width - 20, 265, 34, 700, "#315f4d");
  });
}

function drawTable(context: CanvasRenderingContext2D, rows: PdfBusinessRow[], startY: number) {
  const right = 1160;
  const columns = [
    { label: "النشاط", x: right, align: "right" as const },
    { label: "الباقة", x: 690, align: "center" as const },
    { label: "الزيارات", x: 500, align: "center" as const },
    { label: "التواصل", x: 305, align: "center" as const },
    { label: "المفضلة", x: 110, align: "center" as const },
  ];
  context.fillStyle = "#315f4d";
  context.beginPath();
  context.roundRect(70, startY, 1100, 58, 12);
  context.fill();
  for (const column of columns) {
    context.textAlign = column.align;
    text(context, column.label, column.x, startY + 30, 21, 700, "#ffffff");
  }
  rows.forEach((business, index) => {
    const y = startY + 58 + index * 58;
    context.fillStyle = index % 2 ? "#f0f4f1" : "#ffffff";
    context.fillRect(70, y, 1100, 58);
    context.textAlign = "right";
    const clippedName =
      business.name.length > 34 ? `${business.name.slice(0, 33)}…` : business.name;
    text(context, clippedName, right, y + 30, 20, 500);
    context.textAlign = "center";
    text(context, business.plan ?? "free", 690, y + 30, 20, 500);
    text(context, business.views.toLocaleString("ar-SA"), 500, y + 30, 20, 500);
    text(context, business.contactClicks.toLocaleString("ar-SA"), 305, y + 30, 20, 500);
    text(context, business.favorites.toLocaleString("ar-SA"), 110, y + 30, 20, 500);
  });
  context.textAlign = "right";
}

function canvasJpeg(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error("تعذر إنشاء صورة صفحة التقرير."));
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      0.92,
    );
  });
}

async function renderReportPdf(rows: PdfBusinessRow[], summary: PdfSummary, range: RangeKey) {
  const chunks: PdfBusinessRow[][] = [];
  for (let index = 0; index < rows.length; index += ROWS_PER_PAGE) {
    chunks.push(rows.slice(index, index + ROWS_PER_PAGE));
  }
  if (!chunks.length) chunks.push([]);
  const pages = await Promise.all(
    chunks.map(async (rows, index) => {
      const { canvas, context } = pageCanvas();
      drawHeader(context, range, index + 1, chunks.length);
      const first = index === 0;
      if (first) drawSummary(context, summary);
      drawTable(context, rows, first ? 350 : 190);
      text(
        context,
        "الأرقام مطابقة للفترة المحددة في لوحة الإدارة وقت إنشاء التقرير.",
        1160,
        1695,
        18,
        400,
        "#78837e",
      );
      return { bytes: await canvasJpeg(canvas), width: canvas.width, height: canvas.height };
    }),
  );
  return buildImagePdf(pages);
}

export async function buildAnalyticsPdf(data: DashboardData, range: RangeKey) {
  return renderReportPdf(
    data.businesses,
    {
      pageViews: data.totals.pageViews,
      businessPageViews: data.totals.businessPageViews,
      contactClicks: data.businesses.reduce((sum, business) => sum + business.contactClicks, 0),
      favorites: data.businesses.reduce((sum, business) => sum + business.favorites, 0),
    },
    range,
  );
}

function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

export async function downloadAnalyticsPdf(data: DashboardData, range: RangeKey) {
  const bytes = await buildAnalyticsPdf(data, range);
  downloadPdf(bytes, `pure-table-analytics-${range}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function downloadBusinessReportPdf(row: PdfBusinessRow, range: RangeKey) {
  const bytes = await renderReportPdf(
    [row],
    {
      pageViews: row.views,
      businessPageViews: row.views,
      contactClicks: row.contactClicks,
      favorites: row.favorites,
    },
    range,
  );
  const safeName =
    row.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "business";
  downloadPdf(
    bytes,
    `pure-table-${safeName}-${range}-${new Date().toISOString().slice(0, 10)}.pdf`,
  );
}
