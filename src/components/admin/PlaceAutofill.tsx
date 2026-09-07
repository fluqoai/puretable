import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPinned,
  Search,
  Sparkles,
} from "lucide-react";
import { autofillPlace, findPlaces } from "@/lib/places.functions";
import type { PlaceCandidate } from "@/lib/places.server";

/** Read-only Google preview. Applying changes only updates the local form; the page Save button persists them. */
export function PlaceAutofill({
  name,
  city,
  businessId,
  branchLimit,
  onBranchSelectionChange,
  onApply,
}: {
  name: string;
  city: string;
  businessId?: string;
  branchLimit?: number | null;
  onBranchSelectionChange?: (placeIds: string[]) => void;
  onApply: (patch: Record<string, unknown>) => void;
}) {
  const search = useServerFn(findPlaces);
  const fill = useServerFn(autofillPlace);
  const [query, setQuery] = useState(name);
  const [busy, setBusy] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PlaceCandidate[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!query.trim() && name.trim()) setQuery(name);
  }, [name, query]);

  async function apply(candidate: PlaceCandidate) {
    setBusy(candidate.placeId);
    setErr(null);
    try {
      const result = await fill({ data: { placeId: candidate.placeId } });
      const { name_from_google, ...fields } = result.fields as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...fields, ...result.arabic };
      if (!name.trim() || /^https?:\/\//i.test(query.trim()))
        patch["name"] = name_from_google ?? candidate.name;
      if (Object.keys(result.hours).length) patch["hours"] = result.hours;
      if (result.coverUrl) patch["cover_url"] = result.coverUrl;

      const missing = [
        ["العنوان", patch["address"]],
        ["الهاتف", patch["phone"]],
        ["الموقع الإلكتروني", patch["website"]],
        ["الإحداثيات", patch["lat"]],
        ["ساعات العمل", patch["hours"]],
        ["الصورة", patch["cover_url"]],
      ]
        .filter(
          ([, value]) =>
            !value || (typeof value === "object" && Object.keys(value as object).length === 0),
        )
        .map(([label]) => label);
      patch["needs_review"] = missing.length > 0;
      patch["review_notes"] = missing.length ? [`لم يجد Google Maps: ${missing.join("، ")}`] : [];

      onApply(patch);
      setCandidates(null);
      setDone(
        missing.length
          ? `طُبقت البيانات على النموذج فقط. راجع الحقول الناقصة: ${missing.join("، ")}، ثم اضغط حفظ.`
          : "طُبقت البيانات على النموذج فقط. راجعها ثم اضغط حفظ أسفل الصفحة.",
      );
    } catch (error) {
      setErr(error instanceof Error ? error.message : "تعذرت تعبئة البيانات");
    } finally {
      setBusy(null);
    }
  }

  async function onSearch() {
    setBusy("search");
    setErr(null);
    setDone(null);
    setCandidates(null);
    setSelectedBranches(new Set());
    onBranchSelectionChange?.([]);
    try {
      const list = (await search({
        data: { query: query.trim(), city: city || undefined, currentBusinessId: businessId },
      })) as PlaceCandidate[];
      if (list.length === 0) setErr("لم يتم العثور على مكان مطابق في Google Maps.");
      else setCandidates(list);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "تعذر البحث");
    } finally {
      setBusy(null);
    }
  }

  function toggleBranch(placeId: string) {
    const next = new Set(selectedBranches);
    if (next.has(placeId)) next.delete(placeId);
    else {
      if (branchLimit != null && next.size >= branchLimit) {
        setErr(`الباقة الحالية تسمح باختيار ${branchLimit} فروع كحد أقصى.`);
        return;
      }
      next.add(placeId);
    }
    setErr(null);
    setSelectedBranches(next);
    onBranchSelectionChange?.([...next]);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        ابحث باسم المكان أو ألصق رابط Google Maps. البحث والمعاينة لا يحفظان أي شيء؛ الحفظ لا يتم
        إلا بزر
        <strong className="text-foreground"> «حفظ» </strong> بعد مراجعتك.
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="google-place-query" className="sr-only">
          اسم المكان أو رابط Google Maps
        </label>
        <input
          id="google-place-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (query.trim().length >= 2 && !busy) void onSearch();
            }
          }}
          placeholder="اسم المكان أو رابط Google Maps"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
          dir="auto"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={query.trim().length < 2 || busy !== null}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy === "search" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          بحث ومعاينة
        </button>
      </div>

      {err && (
        <p role="alert" className="text-xs text-destructive">
          {err}
        </p>
      )}
      {done && (
        <p className="flex items-start gap-1.5 text-xs text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {done}
        </p>
      )}

      {candidates && (
        <div className="space-y-3">
          <p className="text-xs font-semibold">
            نتائج Google Maps — راجع التفاصيل واختر المكان الصحيح:
          </p>
          {candidates.map((candidate) => {
            const otherDuplicate = candidate.duplicateMatches?.find(
              (match) => match.kind === "other_business",
            );
            const savedHere = candidate.duplicateMatches?.find(
              (match) => match.kind === "saved_here",
            );
            const permanentlyClosed = candidate.businessStatus === "CLOSED_PERMANENTLY";
            return (
              <article
                key={candidate.placeId}
                className={`rounded-xl border p-4 ${otherDuplicate ? "border-amber-500/60 bg-amber-500/5" : "border-border"}`}
              >
                <div className="flex items-start gap-3">
                  <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div>
                      <p className="font-medium">
                        {candidate.name}
                        {candidate.rating ? ` · ★ ${candidate.rating}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {candidate.address || "العنوان غير متوفر"}
                      </p>
                    </div>
                    <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="inline text-muted-foreground">المدينة: </dt>
                        <dd className="inline">{candidate.city ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">الحي: </dt>
                        <dd className="inline">{candidate.district ?? "—"}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">الهاتف: </dt>
                        <dd className="inline" dir="ltr">
                          {candidate.phone ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">ساعات العمل: </dt>
                        <dd className="inline">
                          {Object.keys(candidate.hours).length ? "متوفرة" : "غير متوفرة"}
                        </dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">الإحداثيات: </dt>
                        <dd className="inline" dir="ltr">
                          {candidate.lat != null && candidate.lng != null
                            ? `${candidate.lat.toFixed(5)}, ${candidate.lng.toFixed(5)}`
                            : "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="inline text-muted-foreground">الموقع: </dt>
                        <dd className="inline">{candidate.website ?? "—"}</dd>
                      </div>
                    </dl>
                    {Object.keys(candidate.hours).length > 0 && (
                      <details className="rounded-lg bg-secondary/60 p-2 text-xs">
                        <summary className="cursor-pointer font-medium">عرض ساعات العمل</summary>
                        <div className="mt-2 grid gap-1 sm:grid-cols-2">
                          {Object.entries(candidate.hours).map(([day, hours]) => (
                            <p key={day}>
                              <span className="font-medium uppercase">{day}:</span> {hours}
                            </p>
                          ))}
                        </div>
                      </details>
                    )}
                    {permanentlyClosed && (
                      <p className="flex items-center gap-1.5 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> مغلق نهائياً حسب Google Maps.
                      </p>
                    )}
                    {otherDuplicate && (
                      <p className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-xs text-amber-800">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        يبدو مكرراً مع «{otherDuplicate.businessName}». راجع النشاط الموجود قبل
                        المتابعة.
                      </p>
                    )}
                    {savedHere && (
                      <p className="text-xs text-muted-foreground">
                        هذا الموقع محفوظ بالفعل ضمن النشاط الحالي.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void apply(candidate)}
                        disabled={busy !== null || !!otherDuplicate || permanentlyClosed}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {busy === candidate.placeId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        تطبيق على النموذج (بدون حفظ)
                      </button>
                      {candidate.mapsUrl && (
                        <a
                          href={candidate.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary"
                        >
                          فتح في الخرائط <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    {onBranchSelectionChange && (
                      <label
                        className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${otherDuplicate || permanentlyClosed ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBranches.has(candidate.placeId)}
                          disabled={!!otherDuplicate || permanentlyClosed}
                          onChange={() => toggleBranch(candidate.placeId)}
                        />
                        إضافة هذا الموقع كفرع عند الضغط على حفظ
                      </label>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
