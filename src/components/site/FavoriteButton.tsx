import { Heart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import type { Business } from "@/data/businesses";
import { useFavoriteIds, useToggleFavorite } from "@/lib/favorites";
import { cn } from "@/lib/utils";

const PENDING_FAVORITE_KEY = "pt.pending.favorite";

/** Heart toggle shown on cards and on the business page. */
export function FavoriteButton({ b, className }: { b: Business; className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId, ids } = useFavoriteIds();
  const toggle = useToggleFavorite(userId);
  const id = b.dbId;
  const on = id ? ids.has(id) : false;

  useEffect(() => {
    if (!id || !userId || on || toggle.isPending) return;
    if (window.sessionStorage.getItem(PENDING_FAVORITE_KEY) !== id) return;
    window.sessionStorage.removeItem(PENDING_FAVORITE_KEY);
    toggle.mutate({ businessId: id, on: true });
  }, [id, on, toggle, userId]);

  if (!id) return null;

  return (
    <button
      type="button"
      aria-label={on ? t("favorites.remove") : t("favorites.add")}
      title={on ? t("favorites.remove") : t("favorites.add")}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!userId) {
          window.sessionStorage.setItem(PENDING_FAVORITE_KEY, id);
          const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          navigate({ to: "/auth", search: { next } });
          return;
        }
        toggle.mutate({ businessId: id, on: !on });
      }}
      disabled={toggle.isPending}
      aria-busy={toggle.isPending}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-primary/40 hover:text-primary",
        on && "border-primary/40 text-primary",
        toggle.isPending && "cursor-wait opacity-60",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", on && "fill-current")} />
    </button>
  );
}
