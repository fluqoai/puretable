import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "./BusinessMap";

export type MapPoint = {
  id: string;
  title: string;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  mapsUrl?: string | null;
  /** Used to look the pin up on Google Maps when no coordinates were saved. */
  query?: string | null;
};

type GoogleMarker = {
  addListener: (event: string, callback: () => void) => void;
  getPosition?: () => unknown;
  setAnimation?: (animation: unknown) => void;
  setMap?: (map: null) => void;
};

type GoogleMap = {
  fitBounds: (bounds: unknown, padding: number) => void;
  getZoom?: () => number | undefined;
  panTo: (position: unknown) => void;
  setZoom?: (zoom: number) => void;
};

type GeocoderResult = {
  geometry?: { location?: { lat: () => number; lng: () => number } };
};

function escapeHtml(v: string) {
  return v.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/**
 * Shows every branch of one business on a single map, with a pin per location.
 * Locations saved without coordinates (most listings) are resolved from their
 * address with the Google geocoder, so the map still shows the right place.
 */
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
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markerRefs = useRef(new Map<string, GoogleMarker>());
  const pointsRef = useRef(points);
  pointsRef.current = points;
  const pointsKey = JSON.stringify(points);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markers: GoogleMarker[] = [];
    const markerMap = markerRefs.current;
    const currentPoints = pointsRef.current;
    if (currentPoints.length === 0) return;

    loadGoogleMaps()
      .then(async () => {
        if (cancelled || !ref.current || !window.google) return;
        const google = window.google;

        // Resolve every point to real coordinates first.
        const geocoder = new google.maps.Geocoder();
        const resolve = (p: MapPoint) =>
          new Promise<(MapPoint & { lat: number; lng: number }) | null>((done) => {
            if (typeof p.lat === "number" && typeof p.lng === "number") {
              done({ ...p, lat: p.lat, lng: p.lng });
              return;
            }
            const address = (p.query || p.address || p.title || "").trim();
            if (!address) {
              done(null);
              return;
            }
            geocoder.geocode(
              { address, region: "SA" },
              (res: GeocoderResult[] | null, status: string) => {
                const loc = status === "OK" ? res?.[0]?.geometry?.location : null;
                done(loc ? { ...p, lat: loc.lat(), lng: loc.lng() } : null);
              },
            );
          });

        const resolved = (await Promise.all(currentPoints.map(resolve))).filter(
          Boolean,
        ) as (MapPoint & {
          lat: number;
          lng: number;
        })[];
        if (cancelled || !ref.current) return;
        if (resolved.length === 0) {
          setEmpty(true);
          return;
        }
        setEmpty(false);

        const map = new google.maps.Map(ref.current, {
          center: { lat: resolved[0]!.lat, lng: resolved[0]!.lng },
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map as GoogleMap;
        markerMap.clear();
        const bounds = new google.maps.LatLngBounds();
        const info = new google.maps.InfoWindow();
        resolved.forEach((p) => {
          const marker = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng },
            map,
            title: p.title,
          });
          markerMap.set(p.id, marker as GoogleMarker);
          const link =
            p.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
          marker.addListener("click", () => {
            onPointSelect?.(p.id);
            info.setContent(
              `<div style="font-family:inherit;max-width:220px">
                 <div style="font-size:13px;font-weight:700;margin-bottom:2px">${escapeHtml(p.title)}</div>
                 ${p.address ? `<div style="font-size:12px;color:#555;margin-bottom:6px">${escapeHtml(p.address)}</div>` : ""}
                 <a href="${escapeHtml(link)}" target="_blank" rel="noreferrer noopener"
                    style="font-size:12px;font-weight:600;color:#2f7d54;text-decoration:none">↗ Google Maps</a>
               </div>`,
            );
            info.open({ anchor: marker, map });
          });
          markers.push(marker as GoogleMarker);
          bounds.extend({ lat: p.lat, lng: p.lng });
        });
        if (resolved.length > 1) map.fitBounds(bounds, 60);
      })
      .catch((error: unknown) => {
        if (!cancelled) setError(error instanceof Error ? error.message : "Google Maps error");
      });

    return () => {
      cancelled = true;
      markers.forEach((m) => m.setMap?.(null));
      markerMap.clear();
      mapRef.current = null;
    };
  }, [onPointSelect, pointsKey]);

  useEffect(() => {
    if (!activePointId) return;
    const marker = markerRefs.current.get(activePointId);
    const map = mapRef.current;
    if (!marker || !map) return;
    const position = marker.getPosition?.();
    if (position) map.panTo(position);
    const zoom = map.getZoom?.() ?? 12;
    if (zoom < 14) map.setZoom?.(14);
    marker.setAnimation?.(window.google?.maps?.Animation?.BOUNCE ?? null);
    const timeout = window.setTimeout(() => marker.setAnimation?.(null), 700);
    return () => window.clearTimeout(timeout);
  }, [activePointId]);

  if (points.length === 0 || empty) return null;
  if (error) {
    return (
      <div
        className="grid place-items-center rounded-2xl border border-border bg-secondary/40 text-sm text-muted-foreground"
        style={{ height }}
      >
        {error}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-[var(--shadow-soft)]">
      <div ref={ref} style={{ height }} className="w-full bg-secondary/40" />
    </div>
  );
}
