export function hasCoordinates<T extends { lat?: number | null; lng?: number | null }>(
  point: T,
): point is T & { lat: number; lng: number } {
  return (
    typeof point.lat === "number" &&
    Number.isFinite(point.lat) &&
    Math.abs(point.lat) <= 90 &&
    typeof point.lng === "number" &&
    Number.isFinite(point.lng) &&
    Math.abs(point.lng) <= 180
  );
}
