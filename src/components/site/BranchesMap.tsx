import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox";
import { hasCoordinates } from "@/lib/coordinates";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export type MapPoint = {
  id: string;
  title: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  mapsUrl?: string | null;
  query?: string | null;
};

export function BranchesMap({
  points,
  height = 360,
  activePointId,
  onPointSelect,
}: {
  points: MapPoint[];
  height?: number;
  activePointId?: string | null;
  onPointSelect?: (id: string) => void;
}) {
  const { lang } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef(new Map<string, Marker>());
  const callback = useRef(onPointSelect);
  callback.current = onPointSelect;
  const pointsKey = JSON.stringify(points.filter(hasCoordinates));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const pins = JSON.parse(pointsKey) as (MapPoint & { lat: number; lng: number })[];
    if (!pins.length) return;
    let cancelled = false;
    let loaded = false;
    let map: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    const registry = markers.current;
    setStatus("loading");
    const timeout = window.setTimeout(() => {
      if (!cancelled) setStatus("error");
    }, 20000);
    loadMapbox()
      .then((mb) => {
        if (cancelled || !container.current) return;
        map = new mb.Map({
          container: container.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [pins[0].lng, pins[0].lat],
          zoom: 13,
          language: lang === "ar" ? "ar" : "en",
          cooperativeGestures: true,
        });
        mapRef.current = map;
        map.addControl(new mb.NavigationControl({ showCompass: false }), "top-right");
        map.once("load", () => {
          loaded = true;
          if (!cancelled) {
            clearTimeout(timeout);
            setStatus("ready");
          }
        });
        map.on("error", () => {
          if (!cancelled && !loaded) setStatus("error");
        });
        const bounds = new mb.LngLatBounds();
        pins.forEach((pin) => {
          const content = document.createElement("div");
          content.dir = lang === "ar" ? "rtl" : "ltr";
          const title = document.createElement("strong");
          title.textContent = pin.title;
          content.append(title);
          if (pin.address) {
            const address = document.createElement("p");
            address.textContent = pin.address;
            content.append(address);
          }
          const marker = new mb.Marker({ color: "#dc2626" })
            .setLngLat([pin.lng, pin.lat])
            .setPopup(new mb.Popup({ offset: 26 }).setDOMContent(content))
            .addTo(map!);
          const el = marker.getElement();
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", pin.title);
          el.tabIndex = 0;
          el.addEventListener("click", () => callback.current?.(pin.id));
          el.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              callback.current?.(pin.id);
            }
          });
          registry.set(pin.id, marker);
          bounds.extend([pin.lng, pin.lat]);
        });
        if (pins.length > 1) map.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      observer?.disconnect();
      registry.forEach((marker) => marker.remove());
      registry.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [pointsKey, lang, attempt]);

  useEffect(() => {
    if (!activePointId || status !== "ready") return;
    const marker = markers.current.get(activePointId);
    if (!marker) return;
    markers.current.forEach((other) => {
      if (other !== marker && other.getPopup()?.isOpen()) other.togglePopup();
    });
    if (!marker.getPopup()?.isOpen()) marker.togglePopup();
    mapRef.current?.easeTo({
      center: marker.getLngLat(),
      zoom: Math.max(mapRef.current.getZoom(), 14),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450,
    });
  }, [activePointId, status]);

  const missing = points.length - points.filter(hasCoordinates).length;
  const empty = pointsKey === "[]";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div
        ref={container}
        style={{ height }}
        className="w-full bg-secondary/40"
        aria-label={lang === "ar" ? "خريطة الأماكن" : "Places map"}
      />
      {(empty || status !== "ready") && (
        <div
          role="status"
          className="absolute inset-0 grid place-content-center gap-3 bg-background/90 p-6 text-center text-sm"
        >
          {empty
            ? lang === "ar"
              ? "لم تُحدَّد إحداثيات هذه الأماكن بعد. التفاصيل متاحة في القائمة."
              : "These places have no saved coordinates yet. See the list for details."
            : status === "error"
              ? lang === "ar"
                ? "تعذر تحميل الخريطة. تحقق من الاتصال أو استخدم القائمة."
                : "Map unavailable. Check your connection or use the list."
              : lang === "ar"
                ? "جارٍ تحميل الخريطة…"
                : "Loading map…"}
          {!empty && status === "error" && (
            <button
              type="button"
              onClick={() => setAttempt((v) => v + 1)}
              className="rounded-lg border p-2"
            >
              {lang === "ar" ? "إعادة المحاولة" : "Retry"}
            </button>
          )}
        </div>
      )}
      {!empty && missing > 0 && (
        <p className="p-2 text-xs text-muted-foreground" role="status">
          {lang === "ar"
            ? `عدد المواقع التي تحتاج إحداثيات: ${missing}`
            : `${missing} locations still need coordinates`}
        </p>
      )}
    </div>
  );
}
