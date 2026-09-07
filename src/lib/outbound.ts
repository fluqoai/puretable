/**
 * Outbound-link safety for the tracked redirect (`/go`).
 *
 * `/go` used to forward to any URL it was given, which made the domain usable
 * for phishing. A target is now only accepted when it is one of the known
 * delivery / booking / social / maps destinations, Pure Table itself, or a URL
 * that is actually stored on the business row it claims to belong to.
 */
export const ALLOWED_HOSTS = [
  "puretable.co",
  // Delivery
  "hungerstation.com",
  "jahez.net",
  "thechefz.co",
  "thechefz.com",
  "toyou.io",
  "keeta.com",
  "keetaapp.com",
  // Booking
  "requeue.io",
  "requeue.com",
  "mytable.sa",
  "mytable.com",
  "opentable.com",
  // Maps
  "google.com",
  "maps.google.com",
  "goo.gl",
  "maps.app.goo.gl",
  "waze.com",
  // Social / contact
  "instagram.com",
  "facebook.com",
  "fb.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "snapchat.com",
  "wa.me",
  "whatsapp.com",
  "linktr.ee",
  "youtube.com",
  "youtu.be",
];

export function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matches(host: string, allowed: string) {
  return host === allowed || host.endsWith(`.${allowed}`);
}

/** True for the fixed list of platform domains we always trust. */
export function isKnownHost(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return ALLOWED_HOSTS.some((a) => matches(host, a));
}

/** `tel:` and `mailto:` targets are safe — they never leave the device. */
export function isContactScheme(url: string): boolean {
  return /^(tel:|mailto:)/i.test(url.trim());
}

/** True when the target host is the same as a URL stored for the business. */
export function matchesStoredHost(url: string, storedUrls: (string | null | undefined)[]): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return storedUrls.some((s) => {
    if (!s) return false;
    const h = hostOf(s);
    return !!h && (h === host || matches(host, h) || matches(h, host));
  });
}
