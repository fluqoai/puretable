import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: MessagesPage,
});

const KEY = ["admin", "contact-messages"] as const;

function MessagesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading, error } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });

  async function toggleRead(id: string, read: boolean) {
    await supabase.from("contact_messages").update({ read: !read }).eq("id", id);
    qc.invalidateQueries({ queryKey: KEY });
  }
  async function remove(id: string) {
    if (!confirm("حذف هذه الرسالة نهائيًا؟")) return;
    await supabase.from("contact_messages").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: KEY });
  }

  const unread = data.filter((m) => !m.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">الرسائل / Messages</h1>
        <p className="text-sm text-muted-foreground">
          كل من يرسل عبر زر «انضم إلينا» أو صفحة التواصل تصلك رسالته هنا — لا يراها أحد غيرك.
          {unread > 0 && <span className="ms-2 font-medium text-primary">({unread} غير مقروءة)</span>}
        </p>
      </div>

      {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          لا توجد رسائل بعد.
        </p>
      )}

      <div className="space-y-3">
        {data.map((m) => (
          <article
            key={m.id}
            className={`rounded-2xl border p-5 shadow-[var(--shadow-soft)] ${
              m.read ? "border-border bg-card" : "border-primary/40 bg-primary-soft"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold">{m.subject || "بدون عنوان"}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.name}
                  {m.email ? ` — ${m.email}` : ""} · {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => toggleRead(m.id, m.read)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/40 hover:text-primary"
                >
                  {m.read ? <Mail className="h-3.5 w-3.5" /> : <MailOpen className="h-3.5 w-3.5" />}
                  {m.read ? "تعليم كغير مقروءة" : "تعليم كمقروءة"}
                </button>
                <button
                  onClick={() => remove(m.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.message}</p>
            {m.email && (
              <a
                href={`mailto:${m.email}`}
                className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
              >
                الرد عبر البريد
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
