/**
 * Shared social-preview image. Businesses use their own cover when they have
 * one; every other page (and covers-less businesses) falls back to this
 * branded card so a shared link never renders without an image.
 */
export const OG_IMAGE = "https://puretable.co/og-pure-table.jpg";

export function ogImageMeta(url?: string | null) {
  const src = url && /^https:\/\//i.test(url) ? url : OG_IMAGE;
  return [
    { property: "og:image", content: src },
    { name: "twitter:image", content: src },
  ];
}
