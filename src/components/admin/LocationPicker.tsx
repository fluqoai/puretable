import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import { loadMapbox } from "@/lib/mapbox";
import { hasCoordinates } from "@/lib/coordinates";

export function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const latest = useRef({ lat, lng, onPick });
  latest.current = { lat, lng, onPick };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let loaded = false;
    let map: MapboxMap | undefined;
    let observer: ResizeObserver | undefined;
    setReady(false);
    setError(false);
    const timeout = window.setTimeout(() => {
      if (!cancelled) setError(true);
    }, 20000);
    loadMapbox()
      .then((mb) => {
        if (cancelled || !container.current) return;
        const point = latest.current;
        map = new mb.Map({
          container: container.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: hasCoordinates(point) ? [point.lng, point.lat] : [46.6753, 24.7136],
          zoom: hasCoordinates(point) ? 15 : 6,
          language: "ar",
        });
        mapRef.current = map;
        map.addControl(new mb.NavigationControl({ showCompass: false }));
        markerRef.current = new mb.Marker({ color: "#dc2626", draggable: true });
        if (hasCoordinates(point)) markerRef.current.setLngLat([point.lng, point.lat]).addTo(map);
        const pick = (nextLat: number, nextLng: number) =>
          latest.current.onPick(Number(nextLat.toFixed(6)), Number(nextLng.toFixed(6)));
        markerRef.current.on("dragend", () => {
          const next = markerRef.current!.getLngLat().wrap();
          pick(next.lat, next.lng);
        });
        map.on("click", (event) => pick(event.lngLat.lat, event.lngLat.wrap().lng));
        map.once("load", () => {
          loaded = true;
          if (!cancelled) {
            clearTimeout(timeout);
            setReady(true);
            setError(false);
          }
        });
        map.on("error", () => {
          if (!cancelled && !loaded) setError(true);
        });
        observer = new ResizeObserver(() => map?.resize());
        observer.observe(container.current);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      observer?.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!hasCoordinates({ lat, lng })) {
      markerRef.current.remove();
      return;
    }
    markerRef.current.setLngLat([lng!, lat!]).addTo(mapRef.current);
    mapRef.current.easeTo({ center: [lng!, lat!], duration: 0 });
  }, [lat, lng, ready]);
  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-xs text-muted-foreground">
        اضغط على الخريطة أو اسحب العلامة لتحديد الموقع. لن يُحفظ إلا عند الضغط على حفظ.
      </p>
      <div className="relative">
        <div
          ref={container}
          className="h-64 w-full overflow-hidden rounded-xl border border-border bg-secondary/40"
          aria-label="تحديد موقع المكان"
        />
        {(!ready || error) && (
          <div
            role="status"
            className="absolute inset-0 grid place-content-center gap-2 bg-background/90 p-4 text-center text-sm"
          >
            {error ? "تعذر تحميل الخريطة. يمكنك إدخال الإحداثيات يدوياً." : "جارٍ تحميل الخريطة…"}
            {error && (
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="rounded border p-2"
              >
                إعادة المحاولة
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
