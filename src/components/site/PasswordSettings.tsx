import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
export function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSaved(false);
    if (password !== confirmation) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    if (password === current) {
      setError("اختر كلمة مرور مختلفة عن الحالية.");
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        current_password: current,
      });
      if (updateError) {
        if (updateError.code === "reauthentication_needed") {
          setError("سجّل الخروج ثم ادخل مجدداً لتأكيد هويتك، وأعد المحاولة.");
        } else if (updateError.code === "weak_password") {
          setError(
            "كلمة المرور لا تستوفي سياسة الأمان. استخدم كلمة أطول تجمع الحروف والأرقام والرموز.",
          );
        } else {
          setError(
            "تعذر تغيير كلمة المرور. تحقق من الكلمة الحالية وصلاحية جلسة الدخول ثم حاول مجدداً.",
          );
        }
        return;
      }
      setCurrent("");
      setPassword("");
      setConfirmation("");
      setShow(false);
      setSaved(true);
    } catch {
      setError("تعذر الاتصال بالخادم. تحقق من اتصالك ثم حاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-lg">
      <h1 className="text-2xl font-semibold">تغيير كلمة المرور</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        غيّر كلمة مرور حسابك دون الحاجة إلى رسالة بريد. ننصح بكلمة فريدة من 12 حرفاً أو أكثر.
      </p>
      <form
        onSubmit={submit}
        className="mt-6 space-y-4 rounded-2xl border bg-card p-6"
        aria-busy={busy}
      >
        <fieldset disabled={busy} className="space-y-4">
          <legend className="sr-only">كلمة مرور الحساب</legend>
          <label className="block text-sm" htmlFor="current-password">
            كلمة المرور الحالية
            <input
              id="current-password"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              dir="ltr"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 focus-visible:outline-primary"
            />
          </label>
          <label className="block text-sm" htmlFor="new-password">
            كلمة المرور الجديدة
            <input
              id="new-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 focus-visible:outline-primary"
            />
          </label>
          <label className="block text-sm" htmlFor="confirm-password">
            تأكيد كلمة المرور الجديدة
            <input
              id="confirm-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              dir="ltr"
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 focus-visible:outline-primary"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            إظهار كلمات المرور
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
          >
            {busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-foreground">
            تم تغيير كلمة المرور بنجاح. استخدم الكلمة الجديدة عند تسجيل الدخول لاحقاً.
          </p>
        )}
      </form>
    </section>
  );
}
