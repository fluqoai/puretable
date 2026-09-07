import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Users } from "lucide-react";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABEL,
  deletePartnerLead,
  listPartnerLeads,
  listWaitlist,
  setPartnerLeadStatus,
  type LeadStatus,
} from "@/lib/partners.functions";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  component: LeadsPage,
});

const STATUS_STYLE: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-amber-500/10 text-amber-600",
  interested: "bg-sky-500/10 text-sky-600",
  agreed: "bg-emerald-500/10 text-emerald-600",
  not_interested: "bg-muted text-muted-foreground",
};

function LeadsPage() {
  const qc = useQueryClient();
  const fetchLeads = useServerFn(listPartnerLeads);
  const fetchWaitlist = useServerFn(listWaitlist);
  const updateStatus = useServerFn(setPartnerLeadStatus);
  const removeLead = useServerFn(deletePartnerLead);

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "partner-leads"],
    queryFn: () => fetchLeads(),
  });
  const { data: waitlist = [] } = useQuery({
    queryKey: ["admin", "waitlist"],
    queryFn: () => fetchWaitlist(),
  });

  async function change(id: string, status: LeadStatus) {
    await updateStatus({ data: { id, status } });
    qc.invalidateQueries({ queryKey: ["admin", "partner-leads"] });
  }
  async function remove(id: string) {
    if (!confirm("حذف هذا الطلب نهائيًا؟")) return;
    await removeLead({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin", "partner-leads"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold">طلبات المنشآت / Partner leads</h1>
        <p className="text-sm text-muted-foreground">
          كل من يرسل عبر صفحة «انضم إلى Pure Table» يظهر هنا مع حالته.
        </p>
      </div>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {!isLoading && leads.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          لا توجد طلبات بعد.
        </p>
      )}

      <div className="space-y-3">
        {leads.map((l) => (
          <article key={l.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold">{l.business_name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[l.status as LeadStatus] ?? ""}`}>
                    {LEAD_STATUS_LABEL[l.status as LeadStatus] ?? l.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[l.business_type, l.city].filter(Boolean).join(" · ")}
                  {" · "}
                  {new Date(l.created_at).toLocaleString()}
                </p>
                <p className="mt-1 text-sm">
                  {[l.contact_name, l.phone, l.email].filter(Boolean).join(" — ")}
                </p>
                {(l.website || l.instagram) && (
                  <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {[l.website, l.instagram].filter(Boolean).join(" · ")}
                  </p>
                )}
                {l.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{l.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  value={l.status}
                  onChange={(e) => change(l.id, e.target.value as LeadStatus)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs"
                >
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{LEAD_STATUS_LABEL[s]}</option>
                  ))}
                </select>
                <button
                  onClick={() => remove(l.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-destructive hover:border-destructive/40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div>
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <Users className="h-4 w-4 text-primary" /> قائمة الانتظار / Waitlist ({waitlist.length})
        </h2>
        {waitlist.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
            لا توجد تسجيلات بعد.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="p-3 text-start">Email</th>
                  <th className="p-3 text-start">City</th>
                  <th className="p-3 text-start">Source</th>
                  <th className="p-3 text-start">Date</th>
                </tr>
              </thead>
              <tbody>
                {waitlist.map((w) => (
                  <tr key={w.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3" dir="ltr">{w.email}</td>
                    <td className="p-3">{w.city || "—"}</td>
                    <td className="p-3">{w.source || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
