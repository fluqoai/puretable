import type { Coordinates } from "@/lib/discovery";

export type LocationFailure = "unsupported" | "denied" | "unavailable" | "timeout";

export class LocationRequestError extends Error {
  constructor(public readonly reason: LocationFailure) {
    super(reason);
  }
}

export async function requestBrowserLocation(): Promise<Coordinates> {
  if (typeof navigator === "undefined" || !navigator.geolocation)
    throw new LocationRequestError("unsupported");

  if (navigator.permissions?.query) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") throw new LocationRequestError("denied");
    } catch (error) {
      if (error instanceof LocationRequestError) throw error;
      // Some browsers expose Permissions API but reject geolocation queries.
    }
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) => {
        const reason: LocationFailure =
          error.code === 1 ? "denied" : error.code === 3 ? "timeout" : "unavailable";
        reject(new LocationRequestError(reason));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  });
}
