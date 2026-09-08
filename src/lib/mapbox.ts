let pending: Promise<typeof import("mapbox-gl").default> | undefined;

/** Loaded only by mounted maps, never during SSR. */
export function loadMapbox() {
  if (!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN) {
    return Promise.reject(new Error("Mapbox is not configured"));
  }
  pending ??= Promise.all([import("mapbox-gl"), import("mapbox-gl/dist/mapbox-gl.css")])
    .then(([{ default: mapbox }]) => {
      mapbox.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
      if (mapbox.getRTLTextPluginStatus() === "unavailable") {
        mapbox.setRTLTextPlugin(
          "https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.3.0/mapbox-gl-rtl-text.js",
          undefined,
          true,
        );
      }
      return mapbox;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
