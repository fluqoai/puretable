import { useLogoUrl } from "@/hooks/use-logo-url";

/**
 * Official Pure Table wheat mark — transparent background, cropped tight so it
 * sits close to the wordmark at any size.
 */
export function LogoMark({ className = "h-8" }: { className?: string }) {
  const logoUrl = useLogoUrl();
  return (
    <img
      src={logoUrl}
      alt="شعار Pure Table"
      decoding="async"
      className={`inline-block object-contain ${className}`}
    />
  );
}
