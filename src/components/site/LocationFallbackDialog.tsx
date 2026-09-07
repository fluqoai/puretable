import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LocationOption } from "@/lib/discovery";

export function LocationFallbackDialog({
  open,
  onOpenChange,
  options,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: LocationOption[];
  onApply: (city: string, district: string | null) => void;
}) {
  const { t } = useTranslation();
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const districts = useMemo(
    () => options.find((option) => option.key === city)?.districts ?? [],
    [city, options],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("filters.choose_location")}</DialogTitle>
          <DialogDescription>{t("filters.choose_location_help")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">
            <span>{t("filters.city")}</span>
            <select
              value={city}
              onChange={(event) => {
                setCity(event.target.value);
                setDistrict("");
              }}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:border-primary"
            >
              <option value="">{t("filters.select_city")}</option>
              {options.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-sm font-medium">
            <span>{t("filters.district")}</span>
            <select
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              disabled={!city || districts.length === 0}
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 outline-none focus:border-primary disabled:opacity-50"
            >
              <option value="">{t("filters.all_districts")}</option>
              {districts.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <DialogFooter>
          <button
            type="button"
            disabled={!city}
            onClick={() => {
              onApply(city, district || null);
              onOpenChange(false);
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {t("filters.show_results")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
