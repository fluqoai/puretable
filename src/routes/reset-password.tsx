import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/site/Layout";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Pure Table" },
      { name: "description", content: "Choose a new password for your Pure Table account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/admin" }), 1200);
    } catch (err: any) {
      setError(err?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">{t("auth.new_password")}</h1>
        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <div>
            <label className="text-xs font-medium">{t("auth.password")}</label>
            <div className="relative mt-1">
              <input type={show ? "text" : "password"} required minLength={6} value={password}
                onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 pe-10 text-sm outline-none focus:border-primary" />
              <button type="button" onClick={() => setShow((v) => !v)}
                aria-label={show ? t("auth.hide_password") : t("auth.show_password")}
                className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {done && <p className="text-xs text-primary">{t("auth.password_updated")}</p>}
          <button type="submit" disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.save_password")}
          </button>
        </form>
      </section>
    </Page>
  );
}
