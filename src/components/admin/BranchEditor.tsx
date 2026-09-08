import { useState } from "react";
import type { z } from "zod";
import { BranchInput } from "@/lib/businesses.schemas";
import { branchLimitLabel, remainingBranchSlots, type PlanTier } from "@/lib/plans";
import { LocationPicker } from "./LocationPicker";

type Branch = z.input<typeof BranchInput>;
const DAYS = [
  ["sun", "الأحد"],
  ["mon", "الاثنين"],
  ["tue", "الثلاثاء"],
  ["wed", "الأربعاء"],
  ["thu", "الخميس"],
  ["fri", "الجمعة"],
  ["sat", "السبت"],
] as const;
const FIELDS = [
  ["name", "اسم الفرع"],
  ["name_ar", "الاسم بالعربية"],
  ["city", "المدينة"],
  ["city_ar", "المدينة بالعربية"],
  ["district", "الحي"],
  ["district_ar", "الحي بالعربية"],
  ["address", "العنوان"],
  ["address_ar", "العنوان بالعربية"],
  ["phone", "الهاتف"],
  ["whatsapp", "واتساب"],
  ["maps_url", "رابط الاتجاهات (اختياري)"],
] as const;

export function BranchEditor({
  businessId,
  city,
  existing,
  plan,
  onSave,
  onDelete,
}: {
  businessId: string;
  city: string;
  existing: Branch[];
  plan: PlanTier;
  onSave: (branch: Branch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const slots = remainingBranchSlots(
    plan,
    existing.filter((b) => b.published && !b.permanently_closed).length,
  );
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const parsed = BranchInput.safeParse(draft);
      if (!parsed.success) throw new Error("راجع اسم الفرع والإحداثيات والحقول المطلوبة.");
      const normalize = (s?: string | null) => (s || "").trim().toLocaleLowerCase();
      if (
        existing.some(
          (b) =>
            b.id !== draft.id &&
            normalize(b.name) === normalize(draft.name) &&
            normalize(b.address) === normalize(draft.address) &&
            normalize(b.city) === normalize(draft.city),
        )
      ) {
        throw new Error("يوجد فرع بنفس الاسم والعنوان والمدينة. عدّل الفرع الموجود.");
      }
      await onSave(parsed.data);
      setDraft(null);
      setMessage("تم حفظ الفرع.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ");
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("حذف هذا الفرع؟ لا يمكن التراجع عن الحذف.")) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(id);
      if (draft?.id === id) setDraft(null);
      setMessage("تم حذف الفرع.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحذف");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4" dir="rtl">
      <p className="text-sm text-muted-foreground">
        أضف الفروع يدوياً وحدد موقع كل فرع على الخريطة. الحد الأقصى للفروع المنشورة:{" "}
        {branchLimitLabel(plan)}. لن تُكتب البيانات قبل الحفظ.
      </p>
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {existing.map((branch) => (
        <div key={branch.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{branch.name_ar || branch.name}</p>
            <p className="text-xs text-muted-foreground">{branch.address_ar || branch.address}</p>
            <p className="text-xs">
              {branch.permanently_closed
                ? "مغلق نهائياً"
                : branch.published
                  ? "منشور"
                  : branch.plan_limited
                    ? "مخفي بسبب الباقة"
                    : "مسودة"}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            className="rounded border px-3 py-1"
            onClick={() => {
              setDraft({ ...branch, hours: { ...branch.hours } });
              setError(null);
            }}
          >
            تعديل
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border px-3 py-1 text-destructive"
            onClick={() => branch.id && void remove(branch.id)}
          >
            حذف
          </button>
        </div>
      ))}
      {!draft && (
        <button
          type="button"
          disabled={busy}
          className="rounded-xl border px-4 py-2"
          onClick={() => {
            setDraft({
              business_id: businessId,
              name: "",
              city,
              published: slots !== 0,
              hours: {},
            });
            setError(null);
          }}
        >
          {slots === 0 ? "إضافة فرع كمسودة" : "إضافة فرع"}
        </button>
      )}
      {draft && (
        <fieldset disabled={busy} className="space-y-4 rounded-xl border p-4">
          <legend className="px-2 font-medium">{draft.id ? "تعديل الفرع" : "فرع جديد"}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label]) => (
              <label key={key} className="grid gap-1 text-sm">
                {label}
                <input
                  className="rounded-lg border bg-background p-2"
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                />
              </label>
            ))}
            {(["lat", "lng"] as const).map((key) => (
              <label key={key} className="grid gap-1 text-sm">
                {key === "lat" ? "خط العرض" : "خط الطول"}
                <input
                  type="number"
                  step="any"
                  min={key === "lat" ? -90 : -180}
                  max={key === "lat" ? 90 : 180}
                  className="rounded-lg border bg-background p-2"
                  value={draft[key] ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      [key]: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            ))}
            <LocationPicker
              lat={draft.lat ?? null}
              lng={draft.lng ?? null}
              onPick={(lat, lng) =>
                setDraft((current) => (current ? { ...current, lat, lng } : current))
              }
            />
            {DAYS.map(([day, label]) => (
              <label key={day} className="grid gap-1 text-sm">
                {label}
                <input
                  placeholder="09:00–22:00 أو مغلق"
                  className="rounded-lg border bg-background p-2"
                  value={draft.hours?.[day] ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, hours: { ...draft.hours, [day]: e.target.value } })
                  }
                />
              </label>
            ))}
          </div>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.published ?? true}
              onChange={(e) =>
                setDraft({ ...draft, published: e.target.checked, plan_limited: false })
              }
            />
            منشور
          </label>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.permanently_closed ?? false}
              onChange={(e) => setDraft({ ...draft, permanently_closed: e.target.checked })}
            />
            مغلق نهائياً
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void save()}
              className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
            >
              {busy ? "جارٍ الحفظ…" : "حفظ الفرع"}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="rounded-lg border px-4 py-2"
            >
              إلغاء
            </button>
          </div>
        </fieldset>
      )}
    </div>
  );
}
