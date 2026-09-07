/**
 * Contact helpers shared by the public site.
 * Everything here is data-driven: an empty value returns null so the caller can
 * skip rendering the button entirely (no empty icons or broken links).
 */

/** Turn a WhatsApp number or pasted link into a chat URL, optionally with a ready message. */
export function whatsappHref(
  value: string | null | undefined,
  message?: string | null,
): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (message) url.searchParams.set("text", message);
      return url.toString();
    } catch {
      return null;
    }
  }
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.length < 8) return null;
  // Saudi local numbers (05…) are normalised to the international form.
  const intl = digits.startsWith("00")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? `966${digits.slice(1)}`
      : digits;
  const url = new URL(`https://wa.me/${intl}`);
  if (message) url.searchParams.set("text", message);
  return url.toString();
}

export function pureTableWhatsAppMessage(lang: "ar" | "en") {
  return lang === "ar"
    ? "مرحباً، وصلتكم عن طريق منصة بيور تيبل وأرغب بـ..."
    : "Hello, I found you through Pure Table and I would like to...";
}

/** Add first-party referral attribution without replacing existing query parameters. */
export function withPureTableUtm(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return value;
    url.searchParams.set("utm_source", "pure_table");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", "business_profile");
    return url.toString();
  } catch {
    return value;
  }
}

/** Instagram handle or full URL → profile URL. */
export function instagramHref(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://instagram.com/${raw.replace(/^@/, "")}`;
}

/** TikTok handle or full URL → profile URL. */
export function tiktokHref(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://www.tiktok.com/@${raw.replace(/^@/, "")}`;
}

/** Email → mailto link. */
export function emailHref(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw || !raw.includes("@")) return null;
  return `mailto:${raw}`;
}
