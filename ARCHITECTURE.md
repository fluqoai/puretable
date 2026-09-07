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
- `SUPABASE_SERVICE_ROLE_KEY` and `GOOGLE_MAPS_API_KEY` are server-only.
- Public Supabase access uses the publishable key together with Row Level Security.
- Administrative mutations require an authenticated admin and are checked again by database policies.

## External services

- Google Maps JavaScript API renders maps in the browser.
- Google Places REST API runs on the server for business lookup and auto-fill.
- Public Google Sheets can be imported through their standard CSV export.
- Google Analytics is optional and enabled only when its measurement ID is configured.
- The public MCP endpoint uses the official Model Context Protocol TypeScript SDK.

## Deployment

Nitro produces the server bundle. Hosting-specific credentials and `APP_URL` are supplied by the deployment environment. No provider-specific development service is required.
