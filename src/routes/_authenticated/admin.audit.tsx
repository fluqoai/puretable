import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: AuditPage,
});

type Row = {
  id: string;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_label: string | null;
  entity_id: string | null;
  created_at: string;
};

function AuditPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, user_email, action, entity, entity_label, entity_id, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw new Error(error.message);
      return (data ?? []) as Row[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          سجل نشاط المشرفين والمحررين — منفصل تمامًا عن إحصائيات الزوار.
        </p>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card p-5">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 text-start">التاريخ والوقت</th>
                <th className="py-2 text-start">المستخدم</th>
                <th className="py-2 text-start">الإجراء</th>
                <th className="py-2 text-start">العنصر</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id} className="border-b border-border/60">
                  <td className="py-2 whitespace-nowrap" dir="ltr">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="py-2">{r.user_email ?? "—"}</td>
                  <td className="py-2 font-medium">{r.action}</td>
                  <td className="py-2 text-muted-foreground">
                    {r.entity ?? "—"}{r.entity_label ? ` · ${r.entity_label}` : ""}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-xs text-muted-foreground">لا يوجد نشاط بعد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
