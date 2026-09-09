// Preserve a place context without allowing public login to redirect to admin or another site.
export function memberDestination(next?: string) {
  return next && /^\/business\/[a-zA-Z0-9_-]+$/.test(next)
    ? "/profile?next=" + encodeURIComponent(next)
    : "/profile";
}
