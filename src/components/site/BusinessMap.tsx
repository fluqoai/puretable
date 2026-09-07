import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import type { Business } from "@/data/businesses";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const GMAPS_CALLBACK = "__pureTableGmapsLoaded";

declare global {
  interface Window {
    google?: any;
    [GMAPS_CALLBACK]?: () => void;
  }
}

let loadingPromise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Missing Google Maps browser key"));

  loadingPromise = new Promise((resolve, reject) => {
    window[GMAPS_CALLBACK] = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=${GMAPS_CALLBACK}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return loadingPromise;
}

export function BusinessMap({ items }: { items: Business[] }) {
  const { lang } = useLanguage();
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Business | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;
    const markers: any[] = [];

    loadGoogleMaps()
      .then(() => {
        if (cancelled || !mapRef.current || !window.google) return;
        const google = window.google;

        // Every business pin plus a pin for each of its branches, so multi-branch
        // places show all of their locations on the map.
        const pins = items.flatMap((b) => {
          const list: { biz: Business; lat: number; lng: number; title: string }[] = [];
          const name = b.name_i18n?.[lang] ?? b.name;
          if (!b.noLocation && b.lat && b.lng) list.push({ biz: b, lat: b.lat, lng: b.lng, title: name });
          if (!b.noLocation) {
            (b.branches ?? []).forEach((br) => {
              if (br.lat == null || br.lng == null) return;
              list.push({ biz: b, lat: br.lat, lng: br.lng, title: `${name} — ${br.name_i18n?.[lang] ?? br.name}` });
            });
          }
          return list;
        });

        const bounds = new google.maps.LatLngBounds();
        pins.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));

        map = new google.maps.Map(mapRef.current, {
          center: pins[0] ? { lat: pins[0].lat, lng: pins[0].lng } : { lat: 24.7136, lng: 46.6753 },
          zoom: 11,
          disableDefaultUI: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
          ],
        });

        pins.forEach((p) => {
          const marker = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: p.title,
          });
          marker.addListener("click", () => setSelected(p.biz));
          markers.push(marker);
        });

        if (pins.length > 1) map.fitBounds(bounds, 60);
      })
      .catch((e) => !cancelled && setError(e.message));

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap?.(null));
    };
  }, [items, lang]);

  if (error) {
    return (
      <div className="grid h-[500px] place-items-center rounded-2xl border border-border bg-secondary/40 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
      <div ref={mapRef} className="h-[500px] w-full bg-secondary/40" />
      {selected && (
        <div className="absolute bottom-4 max-w-sm rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-elevated)] ltr:left-4 rtl:right-4">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2 text-xs text-muted-foreground hover:text-foreground ltr:right-3 rtl:left-3"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="flex gap-3">
            <img src={selected.cover} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0">
              <h3 className="truncate font-display text-base font-semibold">
                {selected.name_i18n?.[lang] ?? selected.name}
              </h3>
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {selected.city_i18n?.[lang] ?? selected.city}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {selected.products_i18n?.[lang] ?? selected.products}
              </p>
            </div>
          </div>
          <Link
            to="/business/$id"
            params={{ id: selected.id }}
            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            {t("common.view_details")}
          </Link>
        </div>
      )}
    </div>
  );
}
