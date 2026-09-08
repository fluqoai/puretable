import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { setBusinessPlan } from "@/lib/businesses.functions";
import { PLAN_LABELS, PLAN_TIERS, planOf, type PlanTier } from "@/lib/plans";
import { usePlanDefinitions } from "@/hooks/use-plan-definitions";
import { planSummary, toFeatures } from "@/lib/subscriptions";

export function BusinessPlanControl({
  businessId,
  name,
  currentPlan,
  onChanged,
}: {
  businessId: string;
  name: string;
  currentPlan: string;
  onChanged?: (plan: PlanTier) => void;
}) {
  const current = planOf({ plan: currentPlan });
  const [selected, setSelected] = useState(current);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const change = useServerFn(setBusinessPlan);
  const qc = useQueryClient();
  const { data: catalog, error: loadError } = usePlanDefinitions();
  useEffect(() => setSelected(current), [current]);

  async function apply() {
    if (!catalog || current === selected) return;
    if (
      !window.confirm(
        `تطبيق ${PLAN_LABELS[selected]} على «${name}»؟ ستتحدث المميزات تلقائياً، وقد تُخفى الفروع الزائدة دون حذفها. لا توجد رسوم.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await change({ data: { id: businessId, plan: selected } });
      onChanged?.(selected);
      setMessage(
        `تم تطبيق ${PLAN_LABELS[selected]}. الفروع المنشورة: ${result.branchStatus.published}، المخفية بسبب الباقة: ${result.branchStatus.hiddenByPlan}.`,
      );
      await Promise.all(
        [
          ["admin-businesses"],
          ["admin-business", businessId],
          ["businesses"],
          ["business"],
          ["admin-business-report"],
          ["dashboard"],
        ].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تغيير الباقة");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <p className="text-sm">
        الباقة الحالية / Current Plan: <strong>{PLAN_LABELS[current]}</strong>
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-40 flex-1 gap-1 text-xs">
          الباقة المطلوبة
          <select
            aria-label={`باقة ${name}`}
            value={selected}
            disabled={busy || !catalog}
            onChange={(e) => setSelected(e.target.value as PlanTier)}
            className="rounded-lg border bg-background p-2 text-sm"
          >
            {PLAN_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {PLAN_LABELS[tier]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !catalog || selected === current}
          onClick={() => void apply()}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "جارٍ التطبيق…" : "تطبيق الباقة"}
        </button>
      </div>
      {catalog && (
        <p className="text-xs leading-6 text-muted-foreground">
          {planSummary(toFeatures(catalog[selected]))}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-primary">
          {message}
        </p>
      )}
      {(error || loadError) && (
        <p role="alert" className="text-xs text-destructive">
          {error || "تعذر تحميل الباقات. أعد تحميل الصفحة."}
        </p>
      )}
    </div>
  );
}
