import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, UserRound, ShieldCheck, LogOut, Camera } from "lucide-react";
import { Page } from "@/components/site/Layout";
import { BusinessCard } from "@/components/site/BusinessCard";
import { PasswordSettings } from "@/components/site/PasswordSettings";
import { supabase } from "@/integrations/supabase/client";
import { useFavoriteIds } from "@/lib/favorites";
import { listBusinesses } from "@/lib/businesses.public.functions";

export const Route = createFileRoute("/profile")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({
    next:
      typeof s.next === "string" && /^\/business\/[a-zA-Z0-9_-]+$/.test(s.next)
        ? s.next
        : undefined,
  }),
  head: () => ({ meta: [{ title: "حسابي — Pure Table" }, { name: "robots", content: "noindex" }] }),
  component: ProfilePage,
});
function ProfilePage() {
  const { next } = Route.useSearch();
  const qc = useQueryClient();
  const favorites = useFavoriteIds();
  const { userId, ready } = favorites;
  const [tab, setTab] = useState<"details" | "favorites" | "security">("details");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const profile = useQuery({
    queryKey: ["member-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data, error }, auth] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).single(),
        supabase.auth.getUser(),
      ]);
      if (error) throw error;
      if (auth.error || auth.data.user?.id !== userId) throw new Error("Session expired");
      return { ...data, email: auth.data.user.email ?? "" };
    },
  });
  const avatar = useQuery({
    queryKey: ["member-avatar", userId, profile.data?.avatar_path],
    enabled: !!profile.data?.avatar_path,
    staleTime: 1_800_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("member-avatars")
        .createSignedUrl(profile.data!.avatar_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  const businesses = useQuery({
    queryKey: ["businesses"],
    queryFn: () => listBusinesses(),
    enabled: !!userId && tab === "favorites",
  });
  useEffect(() => {
    if (ready && !userId) window.location.replace("/auth");
  }, [ready, userId]);
  useEffect(() => {
    if (profile.data) {
      setName(profile.data.display_name);
      setCity(profile.data.city);
    }
  }, [profile.data]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!userId || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let path = profile.data?.avatar_path ?? null;
      if (file) {
        path = userId + "/avatar";
        const { error } = await supabase.storage
          .from("member-avatars")
          .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "0" });
        if (error) throw error;
      }
      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: name.trim(), city: city.trim(), avatar_path: path })
        .eq("id", userId)
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Save failed");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["member-profile", userId] }),
        qc.invalidateQueries({ queryKey: ["member-avatar", userId] }),
      ]);
      setFile(null);
      setMessage("تم حفظ بياناتك بنجاح.");
    } catch {
      setError("تعذر حفظ البيانات. تحقق من اتصالك ثم حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      setError("تعذر تسجيل الخروج. حاول مجدداً.");
      setBusy(false);
      return;
    }
    qc.clear();
    window.location.assign("/auth");
  }
  if (!ready || !userId || profile.isLoading)
    return (
      <Page>
        <p role="status" className="p-16 text-center">
          جارٍ تحميل حسابك…
        </p>
      </Page>
    );
  if (profile.isError)
    return (
      <Page>
        <div role="alert" className="p-16 text-center">
          تعذر تحميل الملف الشخصي.
          <button onClick={() => void profile.refetch()} className="m-3 underline">
            إعادة المحاولة
          </button>
        </div>
      </Page>
    );
  const saved = (businesses.data ?? []).filter((b) => b.dbId && favorites.ids.has(b.dbId));
  return (
    <Page>
      <section dir="rtl" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="rounded-3xl border border-primary/15 bg-primary-soft p-6 sm:p-10">
          <p className="text-xs font-medium text-primary">مساحتك في Pure Table</p>
          <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-4 border-background bg-background shadow-sm">
              {preview || avatar.data ? (
                <img
                  src={preview || avatar.data}
                  alt="صورتك الشخصية"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="min-w-0 w-full sm:w-auto sm:flex-1">
              <h1 className="break-words text-2xl font-semibold sm:text-3xl">
                أهلاً، {profile.data?.display_name || "صديق بيور تيبل"}
              </h1>
              <p dir="ltr" className="mt-2 break-all text-right text-sm text-muted-foreground">
                {profile.data?.email}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                بياناتك وأماكنك المفضلة، معك على كل أجهزتك.
              </p>
            </div>
            <button
              disabled={busy}
              onClick={() => void signOut()}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-background px-4 text-sm"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </div>
        </header>
        {next && (
          <a
            href={next}
            className="mt-5 inline-flex min-h-11 items-center rounded-full border px-5 text-sm"
          >
            العودة إلى المحل الذي كنت تتصفحه ←
          </a>
        )}
        <div className="mt-8 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="أقسام الملف الشخصي"
            className="flex flex-wrap gap-2 self-start rounded-2xl border bg-card p-3 lg:flex-col"
          >
            {(
              [
                { id: "details", label: "بياناتي الشخصية", icon: UserRound },
                { id: "favorites", label: "مفضلاتي", icon: Heart },
                { id: "security", label: "كلمة المرور", icon: ShieldCheck },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm ${tab === item.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 rounded-2xl border bg-card p-5 sm:p-8">
            {tab === "details" && (
              <form onSubmit={save} className="max-w-lg space-y-5">
                <h2 className="text-xl font-semibold">بياناتي الشخصية</h2>
                <p className="text-sm text-muted-foreground">
                  هذه البيانات خاصة بك ولا تظهر للزوار.
                </p>
                <fieldset disabled={busy} className="space-y-5">
                  <label className="block text-sm">
                    الاسم
                    <input
                      required
                      maxLength={100}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-2 w-full rounded-xl border bg-background p-3"
                    />
                  </label>
                  <label className="block text-sm">
                    المدينة
                    <input
                      maxLength={100}
                      autoComplete="address-level2"
                      list="profile-cities"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="mt-2 w-full rounded-xl border bg-background p-3"
                    />
                    <datalist id="profile-cities">
                      <option value="الرياض" />
                      <option value="جدة" />
                      <option value="الدمام" />
                    </datalist>
                  </label>
                  <label className="block text-sm">
                    <span className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      الصورة الشخصية
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="mt-3 block w-full text-sm"
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        setError("");
                        setMessage("");
                        if (!selected) return;
                        if (
                          !["image/png", "image/jpeg", "image/webp"].includes(selected.type) ||
                          selected.size > 2097152
                        ) {
                          setError("اختر صورة PNG أو JPG أو WebP بحجم لا يتجاوز 2 ميجابايت.");
                          e.target.value = "";
                          return;
                        }
                        setFile(selected);
                      }}
                    />
                    <span className="mt-2 block text-xs text-muted-foreground">
                      PNG أو JPG أو WebP، حتى 2 ميجابايت. تظهر معاينة قبل الحفظ.
                    </span>
                  </label>
                  <button className="min-h-11 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground">
                    {busy ? "جارٍ الحفظ…" : "حفظ التغييرات"}
                  </button>
                </fieldset>
              </form>
            )}
            {tab === "security" && <PasswordSettings />}
            {tab === "favorites" && (
              <section>
                <h2 className="text-xl font-semibold">أماكنك المفضلة</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  اضغط القلب لإزالة مكان من قائمتك.
                </p>
                {favorites.isLoading || businesses.isLoading ? (
                  <p role="status" className="mt-8">
                    جارٍ تحميل المفضلة…
                  </p>
                ) : favorites.error || businesses.error ? (
                  <p role="alert" className="mt-8">
                    تعذر تحميل المفضلة.
                    <button
                      className="m-2 underline"
                      onClick={() => {
                        void favorites.refetch();
                        void businesses.refetch();
                      }}
                    >
                      إعادة المحاولة
                    </button>
                  </p>
                ) : saved.length ? (
                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    {saved.map((b) => (
                      <BusinessCard key={b.id} b={b} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl bg-secondary/40 p-8 text-center">
                    <Heart className="mx-auto h-8 w-8 text-primary" />
                    <p className="mt-4">لم تحفظ أماكن متاحة للعرض بعد.</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      قد تُخفى بعض الأماكن مؤقتاً دون حذفها من مفضلاتك.
                    </p>
                    <Link
                      to="/"
                      className="mt-5 inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm text-primary-foreground"
                    >
                      اكتشف الأماكن
                    </Link>
                  </div>
                )}
              </section>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="mt-4 text-sm text-primary">
                {message}
              </p>
            )}
          </div>
        </div>
      </section>
    </Page>
  );
}
