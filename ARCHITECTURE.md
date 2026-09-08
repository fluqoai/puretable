# Architecture

Pure Table is a TanStack Start application with server rendering, server functions, and a Supabase backend.

## Main areas

- `src/routes/` — public pages, authenticated administration, and server endpoints.
- `src/components/site/` — visitor-facing components.
- `src/components/admin/` — administration components.
- `src/lib/` — search, plans, analytics, imports, integrations, and shared business rules.
- `src/integrations/supabase/` — browser and server Supabase clients plus generated database types.
- `supabase/migrations/` — versioned database schema and security policies.

## Runtime boundaries

- Variables prefixed with `VITE_` are public browser configuration.
- `SUPABASE_SERVICE_ROLE_KEY` are server-only.
- Public Supabase access uses the publishable key together with Row Level Security.
- Administrative mutations require an authenticated admin and are checked again by database policies.

## External services

- Mapbox GL JS is lazy-loaded in the browser for maps and manual coordinate picking.
- No external place search or enrichment API is used. Admin-entered coordinates are authoritative.
- Public Google Sheets can be imported through their standard CSV export.
- PostHog EU receives explicit anonymous events; first-party analytics and reports are unchanged.
- The public MCP endpoint uses the official Model Context Protocol TypeScript SDK.

## Deployment

Nitro produces the server bundle. Hosting-specific credentials and `APP_URL` are supplied by the deployment environment. No provider-specific development service is required.
