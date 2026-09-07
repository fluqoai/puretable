import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/components/site/BusinessMap";

// Click anywhere on the map to pin the business location.
export function LocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then(() => {
      if (cancelled || !ref.current || mapRef.current) return;
      const google = (window as any).google;
      const center = lat != null && lng != null ? { lat, lng } : { lat: 24.7136, lng: 46.6753 };
      const map = new google.maps.Map(ref.current, {
        center,
        zoom: lat != null ? 15 : 10,
        mapTypeControl: false,
        streetViewControl: false,
      });
      mapRef.current = map;
      if (lat != null && lng != null) {
        markerRef.current = new google.maps.Marker({ position: center, map });
      }
      map.addListener("click", (e: any) => {
        const next = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        if (markerRef.current) markerRef.current.setPosition(next);
        else markerRef.current = new google.maps.Marker({ position: next, map });
        pickRef.current(Number(next.lat.toFixed(6)), Number(next.lng.toFixed(6)));
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in sync when lat/lng are typed manually.
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;
    const google = (window as any).google;
    const pos = { lat, lng };
    if (markerRef.current) markerRef.current.setPosition(pos);
    else markerRef.current = new google.maps.Marker({ position: pos, map: mapRef.current });
    mapRef.current.setCenter(pos);
  }, [lat, lng]);

  return (
    <div className="sm:col-span-2">
      <p className="mb-2 text-xs text-muted-foreground">Click the map to pin the exact location.</p>
      <div ref={ref} className="h-64 w-full overflow-hidden rounded-xl border border-border bg-secondary/40" />
    </div>
  );
}
