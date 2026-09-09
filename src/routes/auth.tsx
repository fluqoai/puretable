import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/site/Layout";
import { memberDestination } from "@/lib/member-auth";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    // Only same-site paths are ever honoured as a post-login destination.
    const raw = s["next"];
    const safe = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
    return safe ? { next: safe } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Pure Table" },
      {
        name: "description",
        content: "Create your Pure Table member profile and save your favorite places.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const REMEMBER_KEY = "pt-remember-email";

function AuthPage() {
  const { t } = useTranslation();
  const { next } = Route.useSearch();
  const destination = memberDestination(next);
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) setEmail(saved);
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) window.location.replace(destination);
    });
  }, [destination]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (remember) window.localStorage.setItem(REMEMBER_KEY, email);
      else window.localStorage.removeItem(REMEMBER_KEY);

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        setNotice(t("auth.reset_sent"));
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + destination,
            data: { display_name: name.trim() },
          },
        });
        if (error) throw error;
        if (data.session) window.location.assign(destination);
        else setNotice(t("auth.check_email"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign(destination);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "تعذر إكمال الطلب. حاول مجدداً.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page>
      <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl font-semibold">
          {mode === "signup"
            ? "إنشاء حساب عضو"
            : mode === "forgot"
              ? "استعادة كلمة المرور"
              : "أهلاً بعودتك"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ملفك الشخصي وأماكنك المفضلة، في مكان واحد.
        </p>
        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
        >
          {mode === "signup" && (
            <label className="block text-sm">
              الاسم
              <input
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="mt-2 w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
          )}
          <div>
            <label htmlFor="member-email" className="text-xs font-medium">
              {t("auth.email")}
            </label>
            <input
              id="member-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {mode !== "forgot" && (
            <div>
              <label htmlFor="member-password" className="text-xs font-medium">
                {t("auth.password")}
              </label>
              <div className="relative mt-1">
                <input
                  id="member-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 pe-10 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t("auth.hide_password") : t("auth.show_password")}
                  className="absolute inset-y-0 end-2 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-[hsl(var(--primary))]"
              />
              {t("auth.remember_me")}
            </label>
            {mode !== "forgot" && (
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setNotice(null);
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("auth.forgot_password")}
              </button>
            )}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && <p className="text-xs text-primary">{notice}</p>}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin"
              ? t("auth.sign_in")
              : mode === "signup"
                ? t("auth.sign_up")
                : t("auth.send_reset")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setNotice(null);
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          >
            {mode === "signin" ? t("auth.no_account") : t("auth.have_account")}
          </button>
        </form>
        <Link
          to="/"
          className="mt-6 text-center text-xs text-muted-foreground hover:text-foreground"
        >
          ← {t("common.back")}
        </Link>
      </section>
    </Page>
  );
}
