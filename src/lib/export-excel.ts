/**
 * Minimal multi-sheet Excel export (SpreadsheetML 2003).
 *
 * Keeps the bundle small — no spreadsheet library needed — and the produced
 * .xls file opens natively in Excel, Numbers and Google Sheets.
 */
export type Sheet = { name: string; rows: (string | number | null | undefined)[][] };

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function cell(v: string | number | null | undefined) {
  const isNum = typeof v === "number" && Number.isFinite(v);
  return `<Cell><Data ss:Type="${isNum ? "Number" : "String"}">${esc(v)}</Data></Cell>`;
}

export function buildWorkbook(sheets: Sheet[]) {
  const body = sheets
    .map(
      (s) =>
        `<Worksheet ss:Name="${esc(s.name).slice(0, 31)}"><Table>${s.rows
          .map((r) => `<Row>${r.map(cell).join("")}</Row>`)
          .join("")}</Table></Worksheet>`,
    )
    .join("");
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${body}</Workbook>`;
}

export function downloadWorkbook(filename: string, sheets: Sheet[]) {
  const name = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  const xml = "\uFEFF" + buildWorkbook(sheets);
  const blob = new Blob([xml], { type: "application/vnd.ms-excel" });

  // Preview iframes can block anchor downloads — fall back to a data URL tab.
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    const dataUrl = `data:application/vnd.ms-excel;charset=utf-8,${encodeURIComponent(xml)}`;
    window.open(dataUrl, "_blank", "noopener");
  }
}

