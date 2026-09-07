/**
 * Delivery / social links are usually pasted from a share sheet, so the text
 * arrives with Arabic share copy, newlines, invisible RTL marks or trailing
 * punctuation glued to the URL. Everything is cleaned here before it is saved
 * so `/go` never receives something it must reject with a 400.
 */

const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\uFEFF]/g;

/** Pull the first real URL out of any pasted text, or null when there is none. */
export function extractUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.toString().replace(INVISIBLE, " ").replace(/\s+/g, " ").trim();
  if (!text) return null;

  // tel: / mailto: values are valid link targets too.
  const scheme = text.match(/(?:tel:|mailto:)[^\s]+/i);
  const http = text.match(/https?:\/\/[^\s]+/i);
  let found = http?.[0] ?? scheme?.[0] ?? null;

  // A bare domain typed without a scheme (e.g. "puretable.co/menu").
  if (!found) {
    const bare = text.match(/(?:^|\s)((?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/i);
    if (bare?.[1]) found = `https://${bare[1]}`;
  }
  if (!found) return null;

  // Strip characters that are almost always sentence punctuation, not URL.
  found = found.replace(/[)\]،,.؟!"'»]+$/u, "");
  return found;
}

/** True when the value contains a usable link target. */
export function isValidLinkUrl(raw: string | null | undefined) {
  return extractUrl(raw) !== null;
}
