import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Pencil, Plus, Save, Tags, Trash2, X } from "lucide-react";
import {
  CATEGORY_CATALOG_KEY,
  CATEGORY_ICONS,
  adminListPlaceCategories,
  deletePlaceCategory,
  upsertPlaceCategory,
  type CategoryBehavior,
  type CategoryIcon,
  type CategoryLevel,
  type PlaceCategory,
} from "@/lib/category.functions";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: CategoriesPage,
});

type CategoryDraft = Omit<PlaceCategory, "id" | "value" | "usage_count"> & { id?: string };

const EMPTY: CategoryDraft = {
  slug: "",
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  level: "main",
  behavior: "manual",
  icon: "tag",
  visible: true,
  sort_order: 100,
};

const BEHAVIOR_LABELS: Record<CategoryBehavior, string> = {
  manual: "اختيار يدوي للمشروع",
  booking: "حجز طاولة",
  featured: "تلقائي حسب باقة Premium",
  nearby: "تلقائي حسب موقع الزائر",
};

const ICON_LABELS: Record<CategoryIcon, string> = {
  tag: "وسم",
  calendar: "تقويم",
  star: "نجمة",
  "map-pin": "موقع",
  truck: "توصيل",
  "shopping-bag": "استلام",
  utensils: "مطعم",
  coffee: "قهوة",
  cookie: "مخبز",
  cake: "حلويات",
  home: "منزل",
  "shopping-cart": "متجر",
};

function CategoriesPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(adminListPlaceCategories);
  const save = useServerFn(upsertPlaceCategory);
  const remove = useServerFn(deletePlaceCategory);
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-place-categories"],
    queryFn: () => list(),
  });
  const [draft, setDraft] = useState<CategoryDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  function startNew(level: CategoryLevel) {
    const nextOrder =
      Math.max(0, ...data.filter((item) => item.level === level).map((item) => item.sort_order)) +
      10;
    setDraft({ ...EMPTY, level, sort_order: nextOrder });
    setMessage(null);
    setFormError(null);
  }

  function startEdit(category: PlaceCategory) {
    setDraft({
      id: category.id,
      slug: category.slug,
      name_ar: category.name_ar,
      name_en: category.name_en,
      description_ar: category.description_ar,
      description_en: category.description_en,
      level: category.level,
      behavior: category.behavior,
      icon: category.icon,
      visible: category.visible,
      sort_order: category.sort_order,
    });
    setMessage(null);
    setFormError(null);
  }

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-place-categories"] }),
      queryClient.invalidateQueries({ queryKey: CATEGORY_CATALOG_KEY }),
    ]);
  }

  async function submit() {
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    try {
      await save({ data: draft });
      logAudit(
        draft.id ? "update_category" : "create_category",
        "place_category",
        draft.id,
        draft.name_ar,
      );
      await refresh();
      setDraft(null);
      setMessage("تم حفظ التصنيف وتحديث الموقع.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "تعذر حفظ التصنيف.");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(category: PlaceCategory) {
    setBusy(true);
    setFormError(null);
    try {
      await save({ data: { ...category, visible: !category.visible } });
      await refresh();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "تعذر تحديث التصنيف.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCategory(category: PlaceCategory) {
    if (!window.confirm(`حذف تصنيف «${category.name_ar}»؟`)) return;
    setBusy(true);
    setFormError(null);
    try {
      await remove({ data: { id: category.id } });
      logAudit("delete_category", "place_category", category.id, category.name_ar);
      await refresh();
      if (draft?.id === category.id) setDraft(null);
      setMessage("تم حذف التصنيف.");
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : "تعذر حذف التصنيف.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p role="status">جارٍ تحميل التصنيفات…</p>;
  if (error)
    return (
      <p role="alert" className="text-destructive">
        تعذر تحميل التصنيفات: {error.message}
      </p>
    );

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <Tags className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">إدارة التصنيفات</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          الرئيسية تظهر كبطاقات كبيرة، والفرعية هي أنواع الأماكن مثل مطاعم ومقاهي. الترتيب الأصغر
          يظهر أولًا.
        </p>
      </header>

      {message && (
        <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
          {message}
        </p>
      )}
      {formError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      {draft && (
        <section className="rounded-2xl border border-primary/30 bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">{draft.id ? "تعديل التصنيف" : "إضافة تصنيف"}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="إغلاق">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="الاسم بالعربية"
              value={draft.name_ar}
              onChange={(value) => setDraft({ ...draft, name_ar: value })}
            />
            <Field
              label="English name"
              dir="ltr"
              value={draft.name_en}
              onChange={(value) => setDraft({ ...draft, name_en: value })}
            />
            <Field
              label="الوصف بالعربية (اختياري)"
              value={draft.description_ar}
              onChange={(value) => setDraft({ ...draft, description_ar: value })}
            />
            <Field
              label="English description (optional)"
              dir="ltr"
              value={draft.description_en}
              onChange={(value) => setDraft({ ...draft, description_en: value })}
            />
            <Field
              label="الرابط المختصر بالإنجليزية"
              dir="ltr"
              value={draft.slug}
              onChange={(value) =>
                setDraft({ ...draft, slug: value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })
              }
            />
            <Field
              label="الترتيب"
              type="number"
              value={String(draft.sort_order)}
              onChange={(value) => setDraft({ ...draft, sort_order: Number(value) || 0 })}
            />
            <SelectField
              label="المستوى"
              value={draft.level}
              onChange={(value) =>
                setDraft({
                  ...draft,
                  level: value as CategoryLevel,
                  behavior: value === "sub" ? "manual" : draft.behavior,
                })
              }
              options={[
                ["main", "رئيسي"],
                ["sub", "فرعي"],
              ]}
            />
            <SelectField
              label="الأيقونة"
              value={draft.icon}
              onChange={(value) => setDraft({ ...draft, icon: value as CategoryIcon })}
              options={CATEGORY_ICONS.map((icon) => [icon, ICON_LABELS[icon]])}
            />
            {draft.level === "main" && (
              <SelectField
                label="طريقة العمل"
                value={draft.behavior}
                onChange={(value) => setDraft({ ...draft, behavior: value as CategoryBehavior })}
                options={Object.entries(BEHAVIOR_LABELS)}
              />
            )}
            <label className="flex items-center gap-2 self-end rounded-xl border p-3 text-sm">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(event) => setDraft({ ...draft, visible: event.target.checked })}
              />
              ظاهر للزوار
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
          </button>
        </section>
      )}

      {(["main", "sub"] as CategoryLevel[]).map((level) => (
        <section
          key={level}
          className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {level === "main" ? "التصنيفات الرئيسية" : "التصنيفات الفرعية"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {level === "main"
                  ? "البطاقات الكبيرة أعلى الصفحة الرئيسية"
                  : "أنواع الأماكن الظاهرة أسفلها"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => startNew(level)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> إضافة
            </button>
          </div>
          <div className="space-y-2">
            {data
              .filter((category) => category.level === level)
              .map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {category.name_ar}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        / {category.name_en}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      الترتيب {category.sort_order} · {BEHAVIOR_LABELS[category.behavior]} · مستخدم
                      في {category.usage_count ?? 0} مشروع
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggle(category)}
                      title={category.visible ? "إخفاء" : "إظهار"}
                      className="rounded-lg border p-2"
                    >
                      {category.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      title="تعديل"
                      className="rounded-lg border p-2"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteCategory(category)}
                      title="حذف"
                      className="rounded-lg border p-2 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  dir,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dir?: "ltr" | "rtl";
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        required
        dir={dir}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2.5"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2.5"
      >
        {options.map(([option, text]) => (
          <option key={option} value={option}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
