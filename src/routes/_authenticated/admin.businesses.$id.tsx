import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import {
  adminGetBusiness,
  upsertBusiness,
  upsertLink,
  deleteLink,
  upsertBranch,
  deleteBranch,
} from "@/lib/businesses.functions";
import { signCoverUploadUrl } from "@/lib/admin.functions";
import { importBranches, findBranches } from "@/lib/places.functions";
import type { PlaceBranch } from "@/lib/places.server";
import { supabase } from "@/integrations/supabase/client";
import { LocationPicker } from "@/components/admin/LocationPicker";
import { PlaceAutofill } from "@/components/admin/PlaceAutofill";
import { MAIN_CITIES, findCity, regionForCity } from "@/lib/saudi";
import { CATEGORY_DEFS } from "@/lib/categories";
import { useFilters } from "@/lib/filters";
import { SERVICE_DEFS, isServiceValue } from "@/lib/services";

import { logAudit } from "@/lib/audit";
import { getBusinessReport } from "@/lib/analytics.dashboard.functions";
import { RANGES, RANGE_LABELS, type RangeKey } from "@/lib/analytics.ranges";
import { downloadBusinessReportPdf } from "@/lib/export-pdf";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Loader2,
  Save,
  X,
  FileText,
  Search,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/businesses/$id")({
  component: EditBusiness,
});

import {
  PLAN_FEATURES,
  PLAN_LABELS,
  PLAN_SUMMARIES,
  PLAN_TIERS,
  branchLimitLabel,
  remainingBranchSlots,
  type PlanTier,
} from "@/lib/plans";

const DEFAULT_HOURS = { sun: "", mon: "", tue: "", wed: "", thu: "", fri: "", sat: "" };
const DEFAULT_FORM = {
  slug: "",
  name: "",
  name_ar: "",
  category: "restaurant" as const,
  categories: [] as string[],
  city: "Riyadh",
  cities: [] as string[],
  city_ar: "الرياض",
  region: null as string | null,
  address: "",
  address_ar: "",
  lat: null as number | null,
  lng: null as number | null,
  phone: "",
  whatsapp: "",
  instagram: "",
  website: "",
  maps_url: "",
  cover_url: "",
  description: "",
  description_ar: "",
  products: "",
  products_ar: "",
  shared_kitchen: false,
  precautions_note: "",
  hours: { ...DEFAULT_HOURS },
  verified: false,
  safety: "red",
  dedicated_gf: false,
  no_location: false,
  published: true,
  // Manual subscription tier — changed here only, no online payment involved.
  plan: "free" as PlanTier,
  offers_booking: false,
  discount_code: "",
  // Gallery photos (cover excluded) — how many are shown depends on the plan.
  photos: [] as string[],
};

const PLAN_OPTIONS = PLAN_TIERS.map((value) => ({ value, label: PLAN_LABELS[value] }));

/** Default visitor-facing text for the orange (shared kitchen) dot — editable per business. */
const DEFAULT_SHARED_NOTE = "مطبخ مشترك لكن المطبخ والأدوات مفصولة";

/** Arabic labels for the shared filter registry, so new filters appear here too. */
const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "مطاعم / Restaurants",
  fine_dining: "مطاعم راقية / Fine dining",
  delivery: "توصيل / Delivery",
  cafe: "مقاهي / Cafes",
  bakery: "مخابز / Bakeries",
  dessert: "حلويات / Desserts",
  home: "أسر منتجة / Home businesses",
  supermarket: "سوبرماركت / Supermarkets",
};

const PLATFORMS = [
  "hungerstation",
  "jahez",
  "thechefz",
  "toyou",
  "keeta",
  "requeue",
  "mytable",
  "website",
  "instagram",
  "x",
  "tiktok",
  "snapchat",
  "facebook",
  "whatsapp",
  "email",
  "maps",
  "phone",
] as const;
const DAYS = [
  ["sun", "Sunday"],
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
] as const;

function EditBusiness() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isNew = id === "new";

  const load = useServerFn(adminGetBusiness);
  const save = useServerFn(upsertBusiness);
  const saveLink = useServerFn(upsertLink);
  const removeLink = useServerFn(deleteLink);
  const saveBranch = useServerFn(upsertBranch);
  const removeBranch = useServerFn(deleteBranch);
  const signUpload = useServerFn(signCoverUploadUrl);
  const pullBranches = useServerFn(importBranches);
  // Built-in filters plus any filter the admin created from Appearance.
  const { all: allFilters } = useFilters();
  const categoryOptions = allFilters.map(
    (f) =>
      [f.value, f.custom ? f.label : (CATEGORY_LABELS[f.value] ?? f.label), f.primary] as [
        string,
        string,
        boolean,
      ],
  );
  // Main categories = how the place is used (book / delivery / pickup).
  // Secondary categories = what the place is (restaurant, cafe, …) plus any
  // filter the admin created. Both allow multiple selections.
  const mainOptions = SERVICE_DEFS.map((s) => [s.value, `${s.ar} / ${s.en}`] as [string, string]);
  const secondaryOptions = categoryOptions
    .filter(([value]) => !isServiceValue(value))
    .map(([value, label]) => [value, label] as [string, string]);

  const { data: existing } = useQuery({
    queryKey: ["admin-business", id],
    queryFn: () => load({ data: { id } }),
    enabled: !isNew,
  });

  const [form, setForm] = useState<any>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pendingGoogleBranches, setPendingGoogleBranches] = useState<string[]>([]);
  // Bumped after a Google Maps autofill so the branch list is fetched automatically.
  const [autoBranchKey, setAutoBranchKey] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) {
      setForm({
        ...DEFAULT_FORM,
        ...existing,
        cities: ((existing as any).cities ?? []) as string[],
        photos: ((existing as any).photos ?? []) as string[],
        hours: { ...DEFAULT_HOURS, ...(existing.hours as object) },
      });
    }
  }, [existing]);

  const links = existing?.business_links ?? [];
  const branches = ((existing as any)?.business_branches ?? [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const selectedPlan = (form.plan ?? "free") as PlanTier;
  const publishedBranchCount = branches.filter((branch: any) => branch.published).length;
  const selectedBranchLimit = PLAN_FEATURES[selectedPlan].branchLimit;

  // The region is never edited by hand — it is derived from the selected city.
  const regionKey: string | null = regionForCity(form.city) ?? form.region ?? null;

  // The first ticked category / city is the primary one stored on the row.
  const selectedCategories: string[] = [
    ...new Set<string>([form.category, ...(form.categories ?? [])].filter(Boolean)),
  ];
  const selectedCities: string[] = [
    ...new Set<string>([form.city, ...(form.cities ?? [])].filter(Boolean)),
  ];

  function up<K extends string>(k: K, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  /**
   * Tick / untick a filter. At least one type category always stays selected,
   * and the primary `category` column only ever holds a type value — service
   * tags (svc_*) live alongside it in the array.
   */
  function toggleCategory(cat: string) {
    setForm((f: any) => {
      const current = [...new Set<string>([f.category, ...(f.categories ?? [])].filter(Boolean))];
      const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
      const types = next.filter((c) => !isServiceValue(c));
      if (types.length === 0) return f;
      return { ...f, category: types[0], categories: next };
    });
  }

  /** Tick / untick a city. At least one city always stays selected. */
  function toggleCity(cityEn: string) {
    setForm((f: any) => {
      const current = [...new Set<string>([f.city, ...(f.cities ?? [])].filter(Boolean))];
      const next = current.includes(cityEn)
        ? current.filter((c) => c !== cityEn)
        : [...current, cityEn];
      if (next.length === 0) return f;
      const main = findCity(next[0]!);
      return {
        ...f,
        city: main?.en ?? next[0],
        city_ar: main?.ar ?? next[0],
        region: main?.region ?? null,
        cities: next,
      };
    });
  }

  /** Save, either as a hidden draft or published to the public site. */
  async function submit(publish: boolean) {
    setSaving(true);
    setErr(null);
    setSavedMessage(null);
    try {
      const payload = { ...form };
      payload.published = publish;
      payload.region = regionKey;
      payload.categories = selectedCategories;
      payload.cities = selectedCities;
      payload.dedicated_gf = payload.safety === "green";
      if (payload.no_location) {
        payload.lat = null;
        payload.lng = null;
        payload.maps_url = null;
        payload.hours = {};
      }

      if (isNew) delete payload.id;
      const saved = await save({ data: payload });
      // New-place Google results stay in memory until this explicit Save action.
      if (isNew && pendingGoogleBranches.length > 0) {
        await pullBranches({ data: { businessId: saved.id, placeIds: pendingGoogleBranches } });
      }
      void logAudit(
        isNew ? "create_business" : publish ? "publish_business" : "save_business_draft",
        "business",
        saved.id,
        payload.name,
      );
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      qc.invalidateQueries({ queryKey: ["businesses"] });
      if (isNew) {
        await navigate({ to: "/admin/businesses/$id", params: { id: saved.id } });
      } else {
        await qc.invalidateQueries({ queryKey: ["admin-business", id] });
        setForm((f: any) => ({ ...f, published: publish }));
        const status = (saved as any).branch_status;
        const branchMessage = status?.hiddenByPlan
          ? ` تم إخفاء ${status.hiddenByPlan} فرع تلقائياً بسبب حد الباقة، وستعود تلقائياً عند رفعها.`
          : "";
        setSavedMessage(
          publish
            ? `تم الحفظ والنشر وتطبيق مزايا ${PLAN_LABELS[selectedPlan]}.${branchMessage}`
            : `تم الحفظ كمسودة وتطبيق مزايا ${PLAN_LABELS[selectedPlan]}.${branchMessage}`,
        );
      }
    } catch (e: any) {
      setErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File) {
    const { token, path, readUrl } = await signUpload({ data: { filename: file.name } });
    const { error } = await supabase.storage
      .from("business-covers")
      .uploadToSignedUrl(path, token, file, {
        contentType: file.type || "application/octet-stream",
      });
    if (error) throw error;
    return readUrl as string;
  }

  async function onUpload(file: File) {
    setUploading(true);
    setErr(null);
    try {
      up("cover_url", await uploadFile(file));
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  /** Gallery photos. The cover counts towards the plan limit. */
  async function onUploadGallery(files: FileList) {
    setUploading(true);
    setErr(null);
    try {
      const limit = PLAN_FEATURES[(form.plan ?? "free") as PlanTier].photoLimit - 1;
      const current: string[] = form.photos ?? [];
      const room = Math.max(0, limit - current.length);
      const picked = Array.from(files).slice(0, room);
      const urls: string[] = [];
      for (const f of picked) urls.push(await uploadFile(f));
      up("photos", [...current, ...urls]);
      if (picked.length < files.length)
        setErr("تم تجاوز عدد الصور المسموح في هذه الباقة — أُضيف ما يسمح به فقط.");
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" /> رجوع / Back
          </button>
          <h1 className="mt-2 font-display text-2xl font-semibold">
            {isNew ? "New business" : form.name || "Edit"}
          </h1>
          {!isNew && (existing as any)?.updated_at && (
            <p className="mt-1 text-xs text-muted-foreground">
              آخر تعديل / Last updated:{" "}
              <span dir="ltr">{new Date((existing as any).updated_at).toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {err}
        </div>
      )}
      {savedMessage && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          {savedMessage}
        </div>
      )}

      {/* Why this record was flagged, with a clear way to clear the flag. */}
      {(form as any).needs_review && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">يحتاج مراجعة / Needs review</p>
              {((form as any).review_notes as string[] | undefined)?.length ? (
                <ul className="list-disc space-y-0.5 ps-4">
                  {((form as any).review_notes as string[]).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              ) : (
                <p>لم يتم تحديد السبب — راجع البيانات الناقصة.</p>
              )}
              <button
                type="button"
                onClick={() => {
                  up("needs_review", false);
                  up("review_notes", []);
                }}
                className="mt-1 rounded-full border border-destructive/40 px-3 py-1 text-xs"
              >
                تم الإصلاح / Mark as reviewed
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
        className="space-y-6"
      >
        <Section title="Autofill from Google Maps">
          <PlaceAutofill
            name={form.name}
            city={form.city}
            businessId={isNew ? undefined : id}
            branchLimit={selectedBranchLimit}
            onBranchSelectionChange={isNew ? setPendingGoogleBranches : undefined}
            onApply={(patch: Record<string, unknown>) => {
              setForm((f: any) => ({
                ...f,
                ...patch,
                hours: patch.hours ? { ...f.hours, ...(patch.hours as object) } : f.hours,
                slug: f.slug || "",
              }));
              // Immediately fetch every branch of this brand for manual selection.
              if (!isNew) setAutoBranchKey((k) => k + 1);
            }}
          />
        </Section>

        <Section title="Cover photo">
          {form.cover_url ? (
            <img src={form.cover_url} alt="" className="mb-3 h-40 w-full rounded-xl object-cover" />
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/40"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}{" "}
              Upload photo
            </button>
            <Input
              label="or paste URL"
              value={form.cover_url ?? ""}
              onChange={(v) => up("cover_url", v)}
              className="flex-1 min-w-[240px]"
              inline
            />
          </div>
        </Section>

        <Section title="ألبوم الصور / Photo gallery">
          <p className="mb-3 text-xs text-muted-foreground">
            عدد الصور مرتبط بالباقة (صورة الغلاف محسوبة ضمنها): Free = 1، Pro / الأسر المنتجة = 8،
            Premium = 15. الحد الحالي لهذه الباقة:{" "}
            {PLAN_FEATURES[(form.plan ?? "free") as PlanTier].photoLimit} صورة — المستخدم الآن:{" "}
            {1 + ((form.photos ?? []) as string[]).length}.
          </p>
          {((form.photos ?? []) as string[]).length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {((form.photos ?? []) as string[]).map((src, i) => (
                <div
                  key={src + i}
                  className="relative overflow-hidden rounded-xl border border-border"
                >
                  <img src={src} alt="" className="h-24 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() =>
                      up(
                        "photos",
                        ((form.photos ?? []) as string[]).filter((_, j) => j !== i),
                      )
                    }
                    className="absolute end-1 top-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-destructive"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files?.length && onUploadGallery(e.target.files)}
          />
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={
              uploading ||
              1 + ((form.photos ?? []) as string[]).length >=
                PLAN_FEATURES[(form.plan ?? "free") as PlanTier].photoLimit
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/40 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}{" "}
            إضافة صور / Add photos
          </button>
        </Section>

        <Section title="Basics">
          <Grid>
            <Input
              label="الاسم / Name"
              required
              value={form.name}
              onChange={(v) => up("name", v)}
            />
            <Input
              label="رابط الصفحة (اختياري) / Slug — optional"
              value={form.slug}
              onChange={(v) => up("slug", v.toLowerCase().replace(/[^a-z0-9-]+/g, "-"))}
            />

            {/* Two pickers, many filters: both allow more than one choice. */}
            <div className="col-span-full space-y-4">
              <div className="text-xs text-muted-foreground">
                اختر أكثر من قسم في كل مجموعة — Main و Secondary معًا
              </div>
              {(
                [
                  [
                    "الأقسام الرئيسية / Main categories",
                    "طريقة الطلب: حجز طاولة، توصيل، استلام",
                    mainOptions,
                  ],
                  [
                    "الأقسام الفرعية / Secondary categories",
                    "نوع المكان: مطاعم، مقاهي، مخابز…",
                    secondaryOptions,
                  ],
                ] as [string, string, [string, string][]][]
              ).map(([groupLabel, hint, options]) =>
                options.length === 0 ? null : (
                  <div key={groupLabel} className="space-y-2">
                    <div className="text-sm font-medium">{groupLabel}</div>
                    <div className="text-xs text-muted-foreground">{hint}</div>
                    <div className="flex flex-wrap gap-2">
                      {options.map(([value, label]) => {
                        const on = selectedCategories.includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleCategory(value)}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                          >
                            {on ? "✓ " : "+ "}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>

            {/* Same pattern for cities — a chain can be ticked in several cities. */}
            <div className="col-span-full space-y-2">
              <div className="text-sm font-medium">
                المدن / Cities{" "}
                <span className="text-xs text-muted-foreground">(اختر أكثر من مدينة)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {MAIN_CITIES.map((c) => {
                  const on = selectedCities.includes(c.en);
                  return (
                    <button
                      key={c.en}
                      type="button"
                      onClick={() => toggleCity(c.en)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
                    >
                      {on ? "✓ " : "+ "}
                      {c.ar}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="col-span-full space-y-2">
              <div className="text-sm font-medium">مستوى الأمان / Safety level</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => up("safety", "green")}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-start text-sm ${form.safety === "green" ? "border-safety-safe bg-safety-safe/10" : "border-border"}`}
                >
                  <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-safety-safe" />
                  <span>
                    <span className="block font-medium">نقطة خضراء — آمن 100%</span>
                    <span className="block text-xs text-muted-foreground">
                      مطبخ مخصص بالكامل وخالٍ من الجلوتين، مناسب لمرضى السيلياك.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => up("safety", "red")}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-start text-sm ${form.safety === "red" ? "border-safety-caution bg-safety-caution/10" : "border-border"}`}
                >
                  <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-safety-caution" />
                  <span>
                    <span className="block font-medium">نقطة حمراء — يحتاج تأكيد</span>
                    <span className="block text-xs text-muted-foreground">
                      يوجد خيارات خالية من الجلوتين، لكن على العميل التأكد من الطاقم والفرع.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((f: any) => ({
                      ...f,
                      shared_kitchen: !f.shared_kitchen,
                      precautions_note: f.precautions_note?.trim()
                        ? f.precautions_note
                        : DEFAULT_SHARED_NOTE,
                    }))
                  }
                  className={`flex items-start gap-2 rounded-xl border p-3 text-start text-sm ${form.shared_kitchen ? "border-safety-shared bg-safety-shared/10" : "border-border"}`}
                >
                  <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-safety-shared" />
                  <span>
                    <span className="block font-medium">نقطة برتقالية — مطبخ مشترك</span>
                    <span className="block text-xs text-muted-foreground">
                      تظهر مع أي تقييم آخر، مع نص قابل للتعديل بالأسفل.
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => up("safety", "none")}
                  className={`flex items-start gap-2 rounded-xl border p-3 text-start text-sm ${form.safety === "none" ? "border-foreground bg-secondary" : "border-border"}`}
                >
                  <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-muted-foreground" />
                  <span>
                    <span className="block font-medium">بدون تقييم</span>
                    <span className="block text-xs text-muted-foreground">
                      لا تظهر أي نقطة على هذا المشروع.
                    </span>
                  </span>
                </button>
              </div>
              {form.shared_kitchen && (
                <Textarea
                  label="نص المطبخ المشترك (يظهر للزائر) / Shared kitchen note"
                  value={form.precautions_note ?? ""}
                  onChange={(v) => up("precautions_note", v)}
                />
              )}
            </div>
          </Grid>
        </Section>

        <Section title="Description">
          <Grid>
            <Textarea
              label="الوصف / Description"
              value={form.description ?? ""}
              onChange={(v) => up("description", v)}
            />
          </Grid>
        </Section>

        <Section title="الباقة / Subscription plan">
          <p className="mb-3 text-xs text-muted-foreground">
            الباقة تُحدَّد يدويًا من هنا فقط — لا يوجد دفع إلكتروني ولا تجديد آلي، ولا تظهر أي أسعار
            للزوار.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {PLAN_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => up("plan", p.value)}
                className={`rounded-xl border p-4 text-start text-sm transition ${
                  selectedPlan === p.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="block font-semibold">{p.label}</span>
                <span
                  className={`mt-1 block text-xs ${selectedPlan === p.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                >
                  {PLAN_SUMMARIES[p.value]}
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
            حد الفروع الظاهرة في الباقة المختارة:{" "}
            <strong className="text-foreground">{branchLimitLabel(selectedPlan)}</strong>.
            {selectedBranchLimit !== null && publishedBranchCount > selectedBranchLimit && (
              <span className="mt-1 block text-amber-700">
                عند الحفظ سيُبقي النظام {selectedBranchLimit} ويخفي{" "}
                {publishedBranchCount - selectedBranchLimit} تلقائياً دون حذفها.
              </span>
            )}
          </div>
        </Section>

        {!isNew && <BusinessPerformance businessId={id} name={form.name} plan={selectedPlan} />}
      </form>

      {!isNew && (
        <Section title="Action buttons (order & contact links)">
          <p className="text-xs text-muted-foreground">
            Paste the exact product URL from each platform. Each click is tracked before
            redirecting. Auto-generated buttons (Call, Instagram, Google Maps) don't need to be
            added here.
          </p>
          <LinksEditor
            businessId={id}
            links={links}
            branches={branches}
            onSave={async (row) => {
              await saveLink({ data: row });
              qc.invalidateQueries({ queryKey: ["admin-business", id] });
            }}
            onDelete={async (linkId) => {
              await removeLink({ data: { id: linkId } });
              qc.invalidateQueries({ queryKey: ["admin-business", id] });
            }}
          />
        </Section>
      )}

      <Section title="Contact & location">
        <Grid>
          <label className="col-span-full flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={!!form.offers_booking}
              onChange={(e) => up("offers_booking", e.target.checked)}
            />
            <span>
              <span className="block font-medium">يوفر خدمة حجز الطاولات</span>
              <span className="block text-xs text-muted-foreground">
                عند التفعيل يظهر النشاط في فلتر «احجز طاولتك» مهما كانت طريقة الحجز.
              </span>
            </span>
          </label>
          <Input
            label="كود الخصم النشط (اختياري) / Active discount code"
            value={form.discount_code ?? ""}
            onChange={(v) => up("discount_code", v)}
            className="sm:col-span-2"
          />
          <p className="col-span-full -mt-2 text-xs text-muted-foreground">
            كود واحد فقط لكل نشاط. اترك الخانة فارغة لإيقافه.
          </p>
          <label className="col-span-full flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={!!form.no_location}
              onChange={(e) => up("no_location", e.target.checked)}
            />
            <span>
              <span className="block font-medium">
                No physical location (online / cloud business)
              </span>
              <span className="block text-xs text-muted-foreground">
                بدون موقع ثابت — يخفي الخريطة والعنوان وساعات العمل وزر "افتح في الخرائط" من صفحة
                النشاط.
              </span>
            </span>
          </label>
          <Input label="Phone" value={form.phone ?? ""} onChange={(v) => up("phone", v)} />
          <Input
            label="واتساب / WhatsApp (رقم أو رابط)"
            value={form.whatsapp ?? ""}
            onChange={(v) => up("whatsapp", v)}
          />
          <Input
            label="Instagram handle (without @)"
            value={form.instagram ?? ""}
            onChange={(v) => up("instagram", v)}
          />
          <Input label="Website" value={form.website ?? ""} onChange={(v) => up("website", v)} />
          {/* Shared kitchen (orange dot) now lives with the safety level options above. */}

          {!form.no_location && (
            <>
              <Input
                label="العنوان / Address"
                value={form.address ?? ""}
                onChange={(v) => up("address", v)}
                className="sm:col-span-2"
              />
              {/* Coordinates are set by the map picker below, never typed by hand. */}

              <Input
                label="Google Maps link (paste from Google Maps)"
                value={form.maps_url ?? ""}
                onChange={(v) => up("maps_url", v)}
                className="sm:col-span-2"
              />
              <LocationPicker
                lat={form.lat}
                lng={form.lng}
                onPick={(lat, lng) => setForm((f: any) => ({ ...f, lat, lng }))}
              />
            </>
          )}
        </Grid>
      </Section>

      {!isNew && (
        <Section title="الفروع / Branches">
          <p className="text-xs text-muted-foreground">
            اضغط "اكتشاف الفروع" (أو استخدم الأوتوفل من خرائط جوجل بالأعلى) ليجلب الموقع كل الفروع
            المرتبطة بهذا الاسم. ✔️ حدّد الفروع الصحيحة — تقدر تختار أكثر من فرع — ثم احفظ. أي فرع
            خطأ احذفه لاحقًا بعلامة ✕، وكل الفروع المحفوظة تظهر كنقاط حمراء على الخريطة أسفل صفحة
            المشروع.
          </p>
          <BranchDiscovery
            businessId={id}
            name={form.name}
            city={form.city}
            existing={branches}
            plan={selectedPlan}
            autoSearchKey={autoBranchKey}
            onImport={async (include) => {
              const res = await pullBranches({ data: { businessId: id, placeIds: include } });
              await qc.invalidateQueries({ queryKey: ["admin-business", id] });
              setForm((f: any) => ({ ...f, no_location: false }));
              return res;
            }}
            onDelete={async (branchId) => {
              await removeBranch({ data: { id: branchId } });
              qc.invalidateQueries({ queryKey: ["admin-business", id] });
            }}
            onToggle={async (row) => {
              await saveBranch({ data: row });
              qc.invalidateQueries({ queryKey: ["admin-business", id] });
            }}
          />
        </Section>
      )}

      {/* Online-only businesses have no storefront, so opening hours are hidden. */}
      {!form.no_location && (
        <Section title="Opening hours">
          <Grid>
            {DAYS.map(([k, label]) => (
              <Input
                key={k}
                label={label}
                value={form.hours[k] ?? ""}
                onChange={(v) => up("hours", { ...form.hours, [k]: v })}
              />
            ))}
          </Grid>
        </Section>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-2">
        <span
          className={`me-auto rounded-full px-3 py-1 text-xs font-medium ${form.published ? "bg-primary/10 text-primary" : "bg-amber-500/15 text-amber-700"}`}
        >
          {form.published ? "الحالة: ظاهر على الموقع" : "الحالة: مسودة مخفية عن الموقع"}
        </span>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            if (window.confirm("سيتم إخفاء هذا المشروع عن الموقع وحفظه كمسودة. متأكد؟"))
              void submit(false);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-[var(--shadow-soft)] disabled:opacity-70"
        >
          <FileText className="h-4 w-4" /> حفظ كمسودة (إخفاء)
        </button>
        <button
          type="button"
          onClick={() => void submit(true)}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-elevated)] disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          حفظ ونشر على الموقع
        </button>
      </div>
    </div>
  );
}

/**
 * Branches are discovered from Google Maps instead of typed in by hand.
 * The admin previews every location found, removes the wrong ones with ✕,
 * and only then imports the rest (opening hours included).
 */
function BranchDiscovery({
  businessId,
  name,
  city,
  existing,
  plan,
  onImport,
  onDelete,
  onToggle,
  autoSearchKey = 0,
}: {
  businessId: string;
  name: string;
  city: string;
  existing: any[];
  plan: PlanTier;
  onImport: (include: string[]) => Promise<{ imported: number; skipped: number }>;
  onDelete: (id: string) => Promise<void>;
  onToggle: (row: any) => Promise<void>;
  autoSearchKey?: number;
}) {
  const discover = useServerFn(findBranches);
  const [found, setFound] = useState<PlaceBranch[] | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const publishedCount = existing.filter((branch) => branch.published).length;
  const remaining = remainingBranchSlots(plan, publishedCount);

  async function search() {
    setBusy(true);
    setMsg(null);
    try {
      const res = (await discover({
        data: { query: name, city: city || undefined, businessId },
      })) as PlaceBranch[];
      setFound(res);
      // Start with a valid selection for the active package instead of allowing
      // a save that the database will reject.
      const eligible = res.filter(
        (place) => !place.duplicateMatches?.length && place.businessStatus !== "CLOSED_PERMANENTLY",
      );
      const initiallyRemoved = new Set(
        res
          .filter(
            (place) =>
              place.duplicateMatches?.length || place.businessStatus === "CLOSED_PERMANENTLY",
          )
          .map((place) => place.placeId),
      );
      if (remaining !== null)
        eligible.slice(remaining).forEach((place) => initiallyRemoved.add(place.placeId));
      setRemoved(initiallyRemoved);
      if (res.length === 0) setMsg("لم يتم العثور على فروع في خرائط جوجل.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Branch search failed");
    } finally {
      setBusy(false);
    }
  }

  // After a Google Maps autofill, look the brand's branches up right away.
  const searchRef = useRef(search);
  searchRef.current = search;
  useEffect(() => {
    if (autoSearchKey > 0) void searchRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSearchKey]);

  async function importKept() {
    setBusy(true);
    setMsg(null);
    try {
      const include = keep.map((p) => p.placeId).filter(Boolean) as string[];
      const res = await onImport(include);
      setFound(null);
      setMsg(`تمت إضافة ${res.imported} فرع، وتم تجاهل ${res.skipped} مكرر.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Branch import failed");
    } finally {
      setBusy(false);
    }
  }

  const keep = (found ?? []).filter((p) => !removed.has(p.placeId));

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-secondary/60 p-3 text-xs text-muted-foreground">
        الباقة الحالية: <strong className="text-foreground">{PLAN_LABELS[plan]}</strong> — الفروع
        الظاهرة {publishedCount}
        من {branchLimitLabel(plan)}.
        {remaining === 0 && (
          <span className="mt-1 block text-amber-700">
            وصل النشاط إلى الحد الحالي. أخفِ فرعاً أو ارفع الباقة قبل إضافة فرع ظاهر.
          </span>
        )}
      </div>
      <div className="space-y-2">
        {existing.map((b) => (
          <div key={b.id} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold">{b.name}</span>
              <span className="truncate text-xs text-muted-foreground">{b.address}</span>
              {!b.published && (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">
                  {b.plan_limited ? "مخفي بسبب الباقة" : "مخفي يدوياً"}
                </span>
              )}
              <div className="ms-auto flex items-center gap-3">
                <button
                  type="button"
                  disabled={!b.published && remaining === 0}
                  title={
                    !b.published && remaining === 0
                      ? "لا توجد مساحة متاحة في الباقة الحالية"
                      : undefined
                  }
                  onClick={async () => {
                    setMsg(null);
                    try {
                      await onToggle({ ...b, published: !b.published, plan_limited: false });
                    } catch (error) {
                      setMsg(error instanceof Error ? error.message : "تعذر تغيير حالة الفرع");
                    }
                  }}
                  className="text-xs text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {b.published ? "إخفاء" : "إظهار"}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(b.id)}
                  className="text-xs text-destructive"
                  title="حذف الفرع"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {/* Per-branch contact details — saved on blur. */}
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                defaultValue={b.phone ?? ""}
                placeholder="هاتف الفرع / Phone"
                onBlur={(e) =>
                  e.target.value !== (b.phone ?? "") &&
                  onToggle({ ...b, phone: e.target.value || null })
                }
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                defaultValue={b.whatsapp ?? ""}
                placeholder="واتساب الفرع / WhatsApp"
                onBlur={(e) =>
                  e.target.value !== (b.whatsapp ?? "") &&
                  onToggle({ ...b, whatsapp: e.target.value || null })
                }
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
              />
            </div>
          </div>
        ))}
        {existing.length === 0 && (
          <p className="text-xs text-muted-foreground">لا توجد فروع بعد.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || !name}
          onClick={search}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          اكتشاف الفروع من خرائط جوجل
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>

      {found && found.length > 0 && (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-4">
          <p className="text-xs font-semibold">
            تم العثور على {found.length} موقع — اختر الفروع الصحيحة ({keep.length} محدد)
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="text-primary"
              onClick={() => {
                const eligible = found.filter(
                  (place) =>
                    !place.duplicateMatches?.length &&
                    place.businessStatus !== "CLOSED_PERMANENTLY",
                );
                const selected = remaining === null ? eligible : eligible.slice(0, remaining);
                setRemoved(
                  new Set(
                    found
                      .filter((place) => !selected.includes(place))
                      .map((place) => place.placeId),
                  ),
                );
              }}
            >
              تحديد المتاح
            </button>
            <button
              type="button"
              className="text-muted-foreground"
              onClick={() => setRemoved(new Set(found.map((p) => p.placeId)))}
            >
              إلغاء الكل
            </button>
          </div>
          {found.map((p) => {
            const key = p.placeId;
            const on = !removed.has(key);
            const savedHere = p.duplicateMatches?.find((match) => match.kind === "saved_here");
            const duplicateElsewhere = p.duplicateMatches?.find(
              (match) => match.kind === "other_business",
            );
            const permanentlyClosed = p.businessStatus === "CLOSED_PERMANENTLY";
            const blocked = !!savedHere || !!duplicateElsewhere || permanentlyClosed;
            return (
              <label
                key={key}
                className={`flex items-start gap-3 rounded-lg border p-3 text-xs ${on ? "border-primary/40 bg-primary-soft/40" : "border-border opacity-70"} ${blocked ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={blocked}
                  className="mt-0.5"
                  onChange={() => {
                    if (!on && remaining !== null && keep.length >= remaining) {
                      setMsg(
                        `يمكن اختيار ${remaining} فروع إضافية فقط في باقة ${plan.toUpperCase()}.`,
                      );
                      return;
                    }
                    setRemoved((s) => {
                      const n = new Set(s);
                      n.has(key) ? n.delete(key) : n.add(key);
                      return n;
                    });
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{p.name}</span>
                  <span className="block text-muted-foreground">
                    {p.address || "العنوان غير متوفر"}
                  </span>
                  <span className="mt-1 block text-muted-foreground">
                    {p.phone ?? "لا يوجد هاتف"} ·{" "}
                    {Object.keys(p.hours).length ? "ساعات العمل متوفرة" : "ساعات العمل غير متوفرة"}
                    {p.website ? " · موقع إلكتروني متوفر" : ""}
                  </span>
                  {savedHere && (
                    <span className="mt-1 block font-medium text-muted-foreground">
                      محفوظ مسبقاً في هذا النشاط
                    </span>
                  )}
                  {duplicateElsewhere && (
                    <span className="mt-1 block font-medium text-amber-700">
                      مكرر مع «{duplicateElsewhere.businessName}»
                    </span>
                  )}
                  {permanentlyClosed && (
                    <span className="mt-1 block font-medium text-destructive">
                      مغلق نهائياً حسب Google Maps
                    </span>
                  )}
                </span>
              </label>
            );
          })}
          <button
            type="button"
            disabled={busy || keep.length === 0}
            onClick={importKept}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} حفظ
            الفروع المحددة ({keep.length})
          </button>
        </div>
      )}

      <input type="hidden" value={businessId} />
    </div>
  );
}

function LinksEditor({
  businessId,
  links,
  branches = [],
  onSave,
  onDelete,
}: {
  businessId: string;
  links: any[];
  branches?: any[];
  onSave: (row: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const EMPTY = { platform: "hungerstation", url: "", label: "", product_name: "", branch_id: "" };
  const [draft, setDraft] = useState(EMPTY);
  async function add() {
    if (!draft.url) return;
    await onSave({
      business_id: businessId,
      ...draft,
      branch_id: draft.branch_id || null,
      sort_order: links.length,
    });
    setDraft(EMPTY);
  }
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? null;
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {links.map((l) => (
          <div
            key={l.id}
            className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
          >
            <span className="text-xs font-semibold capitalize text-primary">{l.platform}</span>
            <span className="truncate text-xs">
              {l.product_name || <span className="text-muted-foreground">(no product name)</span>}
              {l.branch_id && (
                <span className="ms-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  {branchName(l.branch_id) ?? "فرع"}
                </span>
              )}
            </span>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="truncate text-xs text-muted-foreground hover:text-primary"
            >
              {l.url}
            </a>
            <button
              onClick={() => onDelete(l.id)}
              className="justify-self-end text-xs text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <div className="grid gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-[140px_1fr_1fr_auto]">
        <select
          value={draft.platform}
          onChange={(e) => setDraft({ ...draft, platform: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          placeholder="Product name (optional)"
          value={draft.product_name}
          onChange={(e) => setDraft({ ...draft, product_name: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        />
        <input
          placeholder="https://…"
          value={draft.url}
          onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          <Plus className="h-3 w-3" /> Add
        </button>
        {branches.length > 0 && (
          <select
            value={draft.branch_id}
            onChange={(e) => setDraft({ ...draft, branch_id: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs sm:col-span-2"
          >
            <option value="">كل الفروع / whole business</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  step,
  className = "",
  inline,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  step?: string;
  className?: string;
  inline?: boolean;
}) {
  return (
    <label className={`flex ${inline ? "items-center gap-2" : "flex-col gap-1"} ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value ?? ""}
        required={required}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 sm:col-span-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <textarea
        rows={3}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Live performance of this business — impressions, views and each click type. */
function BusinessPerformance({
  businessId,
  name,
  plan,
}: {
  businessId: string;
  name: string;
  plan: PlanTier;
}) {
  const fetchReport = useServerFn(getBusinessReport);
  const [range, setRange] = useState<RangeKey>("30d");
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-business-report", businessId, range],
    queryFn: () => fetchReport({ data: { businessId, range } }),
  });

  const report = data?.report ?? null;
  const previous = data?.previous ?? null;
  const cells: [string, keyof NonNullable<typeof report>][] = [
    ["الظهور في النتائج / Impressions", "impressions"],
    ["مشاهدات الصفحة / Page views", "views"],
    ["الاتجاهات / Directions", "maps"],
    ["التوصيل / Delivery", "delivery"],
    ["الحجز / Booking", "booking"],
    ["واتساب / WhatsApp", "whatsapp"],
    ["الموقع الإلكتروني / Website", "website"],
    ["الاتصال / Calls", "phone"],
    ["نقرات التواصل / Contact clicks", "contactClicks"],
    ["الإضافات للمفضلة / Favorite adds", "favorites"],
  ];

  return (
    <Section title="أداء المنشأة / Performance">
      <div className="mb-3 flex items-center gap-2">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as RangeKey)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs"
        >
          {RANGES.map((r) => (
            <option key={r} value={r}>
              {RANGE_LABELS[r]}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!report || exporting}
          onClick={async () => {
            if (!report) return;
            setExporting(true);
            try {
              await downloadBusinessReportPdf(
                {
                  name,
                  plan,
                  views: report.views,
                  contactClicks: report.contactClicks,
                  favorites: report.favorites,
                },
                range,
              );
            } catch (pdfError) {
              alert(`تعذّر إنشاء ملف PDF: ${(pdfError as Error).message}`);
            } finally {
              setExporting(false);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileText className="h-3.5 w-3.5" />
          )}
          PDF للفترة المختارة
        </button>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data?.level === "none" ? (
        <p className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground">
          التقارير غير مفعّلة في الباقة المجانية — ارفع الباقة إلى Pro أو Premium لعرض الأرقام.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {report &&
              cells.map(([label, key]) => {
                const value = (report[key] as number) ?? 0;
                const prev = previous ? ((previous[key] as number | undefined) ?? 0) : null;
                const delta = prev === null ? null : value - prev;
                return (
                  <div key={label} className="rounded-2xl border border-border bg-card p-4">
                    <p className="text-[11px] text-muted-foreground">{label}</p>
                    <p className="mt-1 font-display text-xl font-semibold">{value}</p>
                    {delta !== null && (
                      <p
                        className={`mt-0.5 text-[11px] ${delta >= 0 ? "text-primary" : "text-destructive"}`}
                      >
                        {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)} مقارنة بالفترة السابقة ({prev})
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
          {data?.level === "full" && (
            <p className="mt-3 text-xs text-muted-foreground">
              باقة Premium: المقارنة مع الفترة السابقة مفعّلة. التقرير الدوري التلقائي بالبريد لم
              يُفعَّل بعد.
            </p>
          )}
        </>
      )}
    </Section>
  );
}
