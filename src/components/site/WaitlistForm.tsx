import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { joinWaitlist } from "@/lib/partners.functions";
import { track } from "@/lib/track";

export function WaitlistForm({
  source = "site",
  language = "ar",
  compact = false,
}: {
  source?: string;
  language?: "ar" | "en";
  compact?: boolean;
}) {
  const submit = useServerFn(joinWaitlist);
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [done, setDone] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const ar = language === "ar";
  const mutation = useMutation({
    mutationFn: () => submit({ data: { email, city: city || null, source } }),
    onSuccess: (result) => {
      setDuplicate(result.duplicate);
      setDone(true);
      track({ event_type: "waitlist_signup", platform: source, label: city || null });
    },
  });

  if (done) {
    return (
      <p role="status" className="rounded-2xl bg-primary-soft p-4 text-sm font-medium text-primary">
        {duplicate
          ? ar
            ? "بريدك مسجل مسبقاً في قائمة الانتظار."
            : "Your email is already on the waitlist."
          : ar
            ? "تم تسجيلك بنجاح في قائمة الانتظار."
            : "You are now on the waitlist."}
      </p>
    );
  }

  return (
    <form
      className={`grid gap-3 ${compact ? "w-full max-w-xl" : "mt-8"}`}
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate();
      }}
    >
      <label className="text-start text-xs font-medium text-muted-foreground">
        {ar ? "البريد الإلكتروني" : "Email"}
        <input
          required
          type="email"
          autoComplete="email"
          maxLength={255}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          className="mt-1.5 min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>
      <label className="text-start text-xs font-medium text-muted-foreground">
        {ar ? "المدينة (اختياري)" : "City (optional)"}
        <select
          value={city}
          onChange={(event) => setCity(event.target.value)}
          className="mt-1.5 min-h-12 w-full rounded-full border border-border bg-card px-5 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">{ar ? "اختر المدينة" : "Choose a city"}</option>
          <option value="الرياض">{ar ? "الرياض" : "Riyadh"}</option>
          <option value="جدة">{ar ? "جدة" : "Jeddah"}</option>
          <option value="الدمام">{ar ? "الدمام" : "Dammam"}</option>
        </select>
      </label>
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {ar ? "تعذر التسجيل الآن. حاول مرة أخرى." : "Could not join right now. Please try again."}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[var(--shadow-soft)] transition hover:opacity-90 disabled:opacity-60"
      >
        {mutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {mutation.isPending
          ? ar
            ? "جارٍ التسجيل…"
            : "Joining…"
          : ar
            ? "سجّلني"
            : "Join the waitlist"}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        {ar
          ? "سنستخدم بريدك لإشعارات إطلاق Pure Table فقط."
          : "We will use your email only for Pure Table launch updates."}
      </p>
    </form>
  );
}
