let pending: Promise<typeof import("posthog-js").default> | undefined;

export function capturePosthog(event: string, properties: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || !import.meta.env.VITE_POSTHOG_KEY) return;
  // Never collect admin/auth screens, raw searches, phone numbers, or redirect URLs.
  if (
    /^\/(admin|admin-login|profile|auth|login|signup|reset-password|forgot-password)(\/|$)/.test(
      location.pathname,
    )
  )
    return;
  pending ??= import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
        capture_pageview: false,
        capture_pageleave: false,
        autocapture: false,
        disable_session_recording: true,
        disable_surveys: true,
        advanced_disable_flags: true,
        person_profiles: "never",
        persistence: "memory",
        respect_dnt: true,
        save_referrer: false,
        save_campaign_params: false,
        disable_capture_url_hashes: true,
        before_send: (payload) => {
          if (!payload) return null;
          // SDK defaults can contain full URLs. Keep only the path, never tokens.
          for (const key of [
            "$current_url",
            "$referrer",
            "$initial_current_url",
            "$initial_referrer",
          ]) {
            const value = payload.properties[key];
            if (typeof value === "string") {
              try {
                const url = new URL(value);
                payload.properties[key] = url.origin + url.pathname;
              } catch {
                delete payload.properties[key];
              }
            }
          }
          delete payload.properties["$set"];
          delete payload.properties["$set_once"];
          return payload;
        },
      });
      return posthog;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  const path = location.pathname;
  void pending
    .then((posthog) =>
      posthog.capture(event, {
        ...properties,
        $current_url: location.origin + path,
        $pathname: path,
      }),
    )
    .catch(() => {});
}
