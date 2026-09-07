/**
 * Business imagery.
 *
 * When a photo exists it is shown on a clean white surface. When no suitable
 * photo could be found, a designed placeholder is rendered instead of a
 * low-quality Google Maps shot: a category icon plus the business name on a
 * single, consistent brand-tinted surface.
 */
const CATEGORY_ICON: Record<string, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  bakery: "🥐",
  dessert: "🧁",
  home: "🏠",
  supermarket: "🛒",
};

export function CoverImage({
  src,
  alt,
  category,
  className = "",
  imgClassName = "",
}: {
  src?: string | null;
  alt: string;
  category?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  if (!src) {
    const icon = CATEGORY_ICON[(category ?? "").toLowerCase()] ?? "🍽️";
    return (
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-secondary px-4 text-center ${className}`}
        aria-label={alt}
        role="img"
      >
        <span className="text-3xl leading-none sm:text-4xl" aria-hidden>
          {icon}
        </span>
        <span className="line-clamp-2 text-xs font-medium text-muted-foreground sm:text-sm">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`h-full w-full bg-background object-contain p-1.5 sm:p-2 ${imgClassName} ${className}`}
    />
  );
}
