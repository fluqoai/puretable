import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signCoverUploadUrl } from "@/lib/admin.functions";
import {
  attachBulkCovers, commitImport, getSheetSync, previewCsvImport, previewSheetImport,
  resolveImportRow, retryImportRow, saveSheetSync, syncSheetNow,
} from "@/lib/import.functions";

import {
  FileSpreadsheet, Images, Loader2, RefreshCw, RotateCw, Table2, UploadCloud, CheckCircle2, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/import")({
  component: ImportPage,
});

type Plan = Awaited<ReturnType<typeof previewCsvImport>>;
type PlanRow = Plan["plan"][number];
type Results = Awaited<ReturnType<typeof commitImport>>;

const TEMPLATE_HEADERS = ["name", "category", "city", "instagram", "hungerstation", "jahez", "thechefz", "toyou", "image_url"];

function summarizeRows(rows: PlanRow[]): Plan["summary"] {
  return {
    create: rows.filter((r) => r.action === "create").length,
    update: rows.filter((r) => r.action === "update").length,
    skip: rows.filter((r) => r.action === "skip").length,
    choose: rows.filter((r) => r.action === "choose").length,
    incomplete: rows.filter((r) => r.status === "incomplete").length,
  };
}

function ImportPage() {
  const qc = useQueryClient();
  const previewCsv = useServerFn(previewCsvImport);
  const previewSheet = useServerFn(previewSheetImport);
  const commit = useServerFn(commitImport);
  const signUpload = useServerFn(signCoverUploadUrl);
  const attach = useServerFn(attachBulkCovers);
  const resolveRow = useServerFn(resolveImportRow);
  const retryRow = useServerFn(retryImportRow);
  const loadSync = useServerFn(getSheetSync);
  const saveSync = useServerFn(saveSheetSync);
  const syncNow = useServerFn(syncSheetNow);

  const [tab, setTab] = useState<"sheet" | "csv" | "images">("sheet");
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [auto, setAuto] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [imageResults, setImageResults] = useState<{ filename: string; matched: string | null }[] | null>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  const { data: syncCfg } = useQuery({ queryKey: ["sheet-sync"], queryFn: () => loadSync() });
  useEffect(() => {
    if (!syncCfg) return;
    setSheetUrl((v) => v || syncCfg.sheet);
    setSheetTab((v) => v || syncCfg.tab);
    setAuto(syncCfg.auto);
  }, [syncCfg]);

  async function run<T>(label: string, fn: () => Promise<T>) {
    setBusy(label); setErr(null);
    try { return await fn(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong"); return null; }
    finally { setBusy(null); }
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-businesses"] });
    qc.invalidateQueries({ queryKey: ["businesses"] });
  }

  async function onPreviewSheet() {
    setResults(null);
    const r = await run("preview", () => previewSheet({ data: { sheet: sheetUrl, tab: sheetTab || undefined } }));
    if (r) setPlan(r);
  }

  async function onSaveSync(nextAuto = auto) {
    setAuto(nextAuto);
    await run("save-sync", async () => {
      await saveSync({ data: { sheet: sheetUrl, tab: sheetTab, auto: nextAuto } });
      qc.invalidateQueries({ queryKey: ["sheet-sync"] });
    });
  }

  async function onSyncNow() {
    setPlan(null); setResults(null);
    await run("sync", async () => {
      await saveSync({ data: { sheet: sheetUrl, tab: sheetTab, auto } });
      const r = await syncNow();
      setResults(r.results);
      if (r.pending.length) setPlan({ plan: r.pending, summary: summarizeRows(r.pending) });
      qc.invalidateQueries({ queryKey: ["sheet-sync"] });
      refresh();
    });
  }

  async function onPreviewCsv() {
    setResults(null);
    const r = await run("preview", () => previewCsv({ data: { text: csvText } }));
    if (r) setPlan(r);
  }

  async function onCsvFile(file: File) {
    const text = await file.text();
    setCsvText(text);
    setResults(null);
    const r = await run("preview", () => previewCsv({ data: { text } }));
    if (r) setPlan(r);
  }

  function replaceRow(index: number, updated: PlanRow) {
    setPlan((current) => {
      if (!current) return current;
      const next = current.plan.map((r) => (r.index === index ? updated : r));
      return { plan: next, summary: summarizeRows(next) };
    });
  }

  async function onChoose(row: PlanRow, placeId: string) {
    setRowBusy(row.index);
    const updated = await run("choose", () => resolveRow({ data: { row, placeId } }));
    setRowBusy(null);
    if (updated) replaceRow(row.index, updated as PlanRow);
  }

  async function onRetry(row: PlanRow) {
    setRowBusy(row.index);
    const updated = await run("retry", () => retryRow({ data: { row } }));
    setRowBusy(null);
    if (updated) replaceRow(row.index, updated as PlanRow);
  }

  function onIgnore(row: PlanRow) {
    setPlan((current) => {
      if (!current) return current;
      const next = current.plan.filter((r) => r.index !== row.index);
      return { plan: next, summary: summarizeRows(next) };
    });
  }

  async function onCommit() {
    if (!plan) return;
    const r = await run("commit", () => commit({ data: { plan: plan.plan } }));
    if (r) {
      setResults(r);
      setPlan(null);
      refresh();
    }
  }

  async function onBulkImages(files: FileList) {
    setImageResults(null);
    await run("images", async () => {
      const items: { filename: string; readUrl: string }[] = [];
      for (const file of Array.from(files)) {
        const { token, path, readUrl } = await signUpload({ data: { filename: file.name } });
        const { error } = await supabase.storage
          .from("business-covers")
          .uploadToSignedUrl(path, token, file, { contentType: file.type || "application/octet-stream" });
        if (error) throw error;
        items.push({ filename: file.name, readUrl });
      }
      const matched = await attach({ data: { items } });
      setImageResults(matched);
      refresh();
      return matched;
    });
  }

  function downloadTemplate() {
    const csv = TEMPLATE_HEADERS.join(",") + "\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "pure-table-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const importable = plan ? plan.summary.create + plan.summary.update : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Bulk import</h1>
        <p className="text-sm text-muted-foreground">
          Keep only <strong>name</strong>, <strong>category</strong> and <strong>city</strong> in your sheet — everything
          else is completed from Google Maps. Duplicates are never created; existing places are updated instead.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([["sheet", "Google Sheets", FileSpreadsheet], ["csv", "CSV file", Table2], ["images", "Bulk photos", Images]] as const).map(
          ([key, label, Icon]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm ${
                tab === key ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ),
        )}
      </div>

      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> <span className="break-all">{err}</span>
        </div>
      )}

      {tab === "sheet" && (
        <Card title="Sync from Google Sheets">
          <p className="text-sm text-muted-foreground">
            Paste the link to your sheet and press <strong>Sync now</strong>. Make sure the sheet is shared with the
            Google account you connected.
          </p>

          <input value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={sheetTab} onChange={(e) => setSheetTab(e.target.value)}
            placeholder="Tab name (optional — first tab by default)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={auto} onChange={(e) => onSaveSync(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[hsl(var(--primary))]" />
            Auto sync every hour (only rows with a confident Google Maps match are imported automatically)
          </label>
          {syncCfg?.lastRun && (
            <p className="text-xs text-muted-foreground">Last sync: {new Date(syncCfg.lastRun).toLocaleString()}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={onSyncNow} disabled={!sheetUrl || busy !== null}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
              {busy === "sync" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sync now
            </button>
            <button onClick={onPreviewSheet} disabled={!sheetUrl || busy !== null}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40 disabled:opacity-60">
              {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Preview first
            </button>
            <button onClick={() => onSaveSync()} disabled={busy !== null}
              className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40 disabled:opacity-60">
              Save sheet
            </button>
            <button onClick={downloadTemplate} className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40">
              Download column template
            </button>
            {/* Open the connected sheet itself, so data can be edited at the source. */}
            <a href={sheetUrl || syncCfg?.sheet || "#"} target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40 ${sheetUrl || syncCfg?.sheet ? "" : "pointer-events-none opacity-50"}`}>
              <FileSpreadsheet className="h-4 w-4" /> فتح في Google Sheets
            </a>

          </div>
        </Card>
      )}

      {tab === "csv" && (
        <Card title="Import a CSV">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => csvFileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40">
              <UploadCloud className="h-4 w-4" /> Choose CSV file
            </button>
            <button onClick={downloadTemplate} className="rounded-full border border-border px-4 py-2 text-sm hover:border-primary/40">
              Download column template
            </button>
            <input ref={csvFileRef} type="file" accept=".csv,.tsv,text/csv" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onCsvFile(f); }} />
          </div>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8}
            placeholder="…or paste rows here (copy straight from a spreadsheet)"
            className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs" />
          <button onClick={onPreviewCsv} disabled={!csvText.trim() || busy !== null}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy === "preview" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Table2 className="h-4 w-4" />}
            Preview changes
          </button>
        </Card>
      )}

      {tab === "images" && (
        <Card title="Bulk photo upload">
          <p className="text-sm text-muted-foreground">
            Select many photos at once. Each file is matched to a business by its filename — name the file after the
            business slug or name (e.g. <code className="rounded bg-secondary px-1">my-gf-bread.jpg</code>).
          </p>
          <button onClick={() => imagesRef.current?.click()} disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy === "images" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            Choose photos
          </button>
          <input ref={imagesRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => { const f = e.target.files; if (f?.length) onBulkImages(f); }} />
          {imageResults && (
            <ul className="space-y-1 text-sm">
              {imageResults.map((r) => (
                <li key={r.filename} className={r.matched ? "text-foreground" : "text-muted-foreground"}>
                  {r.matched ? `✓ ${r.filename} → ${r.matched}` : `• ${r.filename} — no matching business`}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {plan && plan.plan.length > 0 && (
        <Card title="Preview">
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill tone="ok">{plan.summary.create} new</Pill>
            <Pill tone="ok">{plan.summary.update} updated</Pill>
            <Pill tone="warn">{plan.summary.incomplete} incomplete</Pill>
            <Pill tone="warn">{plan.summary.choose} need your choice</Pill>
            <Pill tone="bad">{plan.summary.skip} failed</Pill>
          </div>
          <div className="max-h-[32rem] overflow-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary/80 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">Row</th>
                  <th className="px-3 py-2 text-start">Business</th>
                  <th className="px-3 py-2 text-start">Status</th>
                  <th className="px-3 py-2 text-start">Details</th>
                  <th className="px-3 py-2 text-end">Fix</th>
                </tr>
              </thead>
              <tbody>
                {plan.plan.map((r) => (
                  <tr key={r.index}
                    className={`border-t border-border align-top ${
                      r.status === "failed" ? "bg-destructive/5"
                        : r.status === "choose" || r.status === "incomplete" ? "bg-amber-500/5" : ""
                    }`}>
                    <td className="px-3 py-2 text-muted-foreground">{r.index + 2}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">/{r.slug}</div>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={r.status} action={r.action} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {r.status === "choose" ? (
                        <div className="space-y-1">
                          <div className="font-medium text-foreground">Which place is it?</div>
                          {(r.candidates ?? []).map((c) => (
                            <button key={c.placeId} onClick={() => onChoose(r, c.placeId)}
                              disabled={busy !== null}
                              className="block w-full rounded-lg border border-border px-2 py-1.5 text-start hover:border-primary/50 disabled:opacity-60">
                              <span className="block font-medium text-foreground">{c.name}</span>
                              <span className="block truncate">{c.address}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {r.errors.length > 0 && <div className="text-destructive">{r.errors.join("; ")}</div>}
                          {r.missing.length > 0 && (
                            <div className="text-amber-600">Missing: {r.missing.join(", ")}</div>
                          )}
                          <div>
                            {r.matchedBy ? `Matched existing by ${r.matchedBy}` : "New business"}
                            {r.autofilled ? " · autofilled from Google Maps" : ""}
                            {r.branches.length ? ` · ${r.branches.length} branch(es)` : ""}
                            {r.imageUrl ? " · photo" : ""}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => onRetry(r)} disabled={busy !== null}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:border-primary/40 disabled:opacity-60">
                          {rowBusy === r.index ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                          Retry
                        </button>
                        <button onClick={() => onIgnore(r)}
                          className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                          Ignore
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={onCommit} disabled={busy !== null || importable === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {busy === "commit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Import {importable} businesses
          </button>
        </Card>
      )}

      {results && (
        <Card title="Import report">
          <div className="flex flex-wrap gap-2 text-xs">
            <Pill tone="ok">{results.filter((r) => r.ok && r.action === "create").length} imported</Pill>
            <Pill tone="ok">{results.filter((r) => r.ok && r.action === "update").length} updated</Pill>
            <Pill tone="warn">{results.filter((r) => r.ok && r.status === "incomplete").length} incomplete</Pill>
            <Pill tone="bad">{results.filter((r) => !r.ok).length} failed</Pill>
          </div>
          <ul className="space-y-1 text-sm">
            {results.map((r, i) => (
              <li key={i} className={!r.ok ? "text-destructive" : r.status === "incomplete" ? "text-amber-600" : "text-foreground"}>
                {r.ok
                  ? `${r.status === "incomplete" ? "!" : "✓"} ${r.name} — ${r.action}d${
                      r.branches ? `, ${r.branches} branch(es)` : ""
                    }${r.missing?.length ? ` · missing: ${r.missing.join(", ")}` : ""}`
                  : `✕ ${r.name} — ${r.message}`}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status, action }: { status: string; action: string }) {
  const map: Record<string, [string, string]> = {
    ready: ["bg-primary/10 text-primary", action === "update" ? "Ready · update" : "Ready · new"],
    incomplete: ["bg-amber-500/15 text-amber-700", "Incomplete"],
    choose: ["bg-amber-500/15 text-amber-700", "Pick a place"],
    failed: ["bg-destructive/10 text-destructive", "Failed"],
    // Already in the directory — a sync only adds what is new.
    skipped: ["bg-secondary text-muted-foreground", "Already added · skipped"],

  };
  const [cls, label] = map[status] ?? ["bg-muted text-muted-foreground", status];
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${cls}`}>{label}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Pill({ children, tone = "ok" }: { children: React.ReactNode; tone?: "ok" | "warn" | "bad" }) {
  const cls =
    tone === "bad" ? "bg-destructive/10 text-destructive"
      : tone === "warn" ? "bg-amber-500/15 text-amber-700"
      : "bg-secondary text-secondary-foreground";
  return <span className={`rounded-full px-3 py-1 ${cls}`}>{children}</span>;
}
