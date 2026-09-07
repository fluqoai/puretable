import { createFileRoute } from "@tanstack/react-router";
import { ogImageMeta } from "@/lib/seo";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { BadgeCheck, BarChart3, MapPinned, Send, Sparkles } from "lucide-react";
import { Page } from "@/components/site/Layout";
import { usePageView } from "@/hooks/use-page-view";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { submitPartnerLead } from "@/lib/partners.functions";
import { track } from "@/lib/track";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "انضم إلى Pure Table — Join Pure Table" },
      {
        name: "description",
        content:
          "أضف منشأتك إلى دليل بيور تيبل ليصل إليك عملاء السيلياك والحساسية من الجلوتين في السعودية. Add your business to the Pure Table gluten-free directory.",
      },
      { property: "og:title", content: "انضم إلى Pure Table — Join Pure Table" },
      {
        property: "og:description",
        content: "اعرض منشأتك أمام عملاء يبحثون تحديدًا عن خيارات خالية من الجلوتين.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageMeta(),
    ],
  }),
  component: PartnersPage,
});

const BENEFITS = [
  {
    icon: MapPinned,
    ar: "ظهور أمام عملاء يبحثون تحديدًا عن خيارات خالية من الجلوتين",
    en: "Reach customers actively searching for gluten-free options",
  },
  {
    icon: BadgeCheck,
    ar: "صفحة كاملة لمنشأتك: الصور، المنتجات، الفروع، أوقات العمل وطرق التواصل",
    en: "A full profile: photos, products, branches, hours and contact links",
  },
  {
    icon: BarChart3,
    ar: "تقارير عن مشاهدات صفحتك والضغطات على التوصيل والحجز والاتجاهات",
    en: "Reports on page views and delivery, booking and directions clicks",
  },
  {
    icon: Sparkles,
    ar: "روابط الطلب والحجز تصل مباشرة لقنواتك — بيور تيبل لا تأخذ عمولة على الطلبات",
    en: "Order and booking links go straight to your own channels — no commission",
  },
];

function PartnersPage() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  usePageView();
  const submit = useServerFn(submitPartnerLead);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    business_type: "",
    city: "",
    contact_name: "",
    phone: "",
    email: "",
    website: "",
    instagram: "",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: async () => submit({ data: form }),
    onSuccess: () => {
      setDone(true);
      track({ event_type: "partner_lead", label: form.city || null });
    },
  });

  const field = (
    key: keyof typeof form,
    labelAr: string,
    labelEn: string,
    opts: { required?: boolean; type?: string; textarea?: boolean } = {},
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">
        {ar ? labelAr : labelEn}
        {opts.required ? " *" : ""}
      </span>
      {opts.textarea ? (
        <textarea
          value={form[key]}
          required={opts.required}
          rows={3}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      ) : (
        <input
          value={form[key]}
          required={opts.required}
          type={opts.type ?? "text"}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="mt-1 w-full rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      )}
    </label>
  );

  return (
    <Page>
      <section className="border-b border-border/60 bg-[var(--gradient-hero)]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Pure Table</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-5xl">
            {ar ? "انضم إلى Pure Table" : "Join Pure Table"}
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {ar
              ? "بيور تيبل دليل يجمع الأماكن التي تقدم خيارات خالية من الجلوتين في السعودية. سجّل اهتمامك وسنتواصل معك."
              : "Pure Table is the directory of places offering gluten-free options in Saudi Arabia. Register your interest and we will get in touch."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div key={b.en} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <b.icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed text-foreground">{ar ? b.ar : b.en}</p>
              </div>
            ))}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elevated)] sm:p-8">
            <h2 className="font-display text-xl font-semibold">
              {ar ? "نموذج الاهتمام" : "Interest form"}
            </h2>
            {done ? (
              <p className="mt-6 rounded-2xl bg-primary-soft p-4 text-sm text-primary">
                {ar
                  ? "وصلنا طلبك — سنتواصل معك قريبًا."
                  : "We received your request — we will contact you soon."}
              </p>
            ) : (
              <form
                className="mt-5 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate();
                }}
              >
                {field("business_name", "اسم المنشأة", "Business name", { required: true })}
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("business_type", "نوع المنشأة", "Business type")}
                  {field("city", "المدينة", "City")}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("contact_name", "اسم المسؤول", "Contact person")}
                  {field("phone", "رقم التواصل", "Phone")}
                </div>
                {field("email", "البريد الإلكتروني", "Email", { type: "email" })}
                <div className="grid gap-3 sm:grid-cols-2">
                  {field("website", "الموقع الإلكتروني", "Website")}
                  {field("instagram", "Instagram", "Instagram")}
                </div>
                {field("notes", "ملاحظات", "Notes", { textarea: true })}

                {mutation.isError && (
                  <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
                )}
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {mutation.isPending ? (ar ? "جارٍ الإرسال…" : "Sending…") : ar ? "إرسال الطلب" : "Send request"}
                </button>
                <p className="text-xs text-muted-foreground">
                  {ar
                    ? "بيور تيبل لا تنفذ الطلب أو الحجز — نحوّل العميل مباشرة إلى قنواتك."
                    : "Pure Table never processes orders or bookings — customers are sent straight to your own channels."}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </Page>
  );
}
