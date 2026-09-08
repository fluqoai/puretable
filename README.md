# Pure Table Finder

Pure Table is a bilingual directory for finding gluten-free restaurants, cafes, bakeries, desserts, supermarkets, and home businesses across Saudi Arabia.

## Technology

- React 19 and TanStack Start
- Vite and Nitro
- Supabase Database, Auth, and Storage
- Mapbox GL JS (maps and manual coordinate picking)
- PostHog EU (anonymous product analytics)
- Tailwind CSS
- Model Context Protocol TypeScript SDK

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and provide the required values.
3. Start the app with `npm run dev`.

Environment files containing real credentials are intentionally ignored by Git. Only `.env.example` should be committed.

## Production

Build with `npm run build`. The Nitro server output is compatible with standard Node.js hosting and platforms such as Vercel. Configure all values from `.env.example` in the hosting provider rather than committing them.

### Maps and analytics

- `VITE_MAPBOX_ACCESS_TOKEN`: a public Mapbox token. Restrict allowed URLs in Mapbox to your production/preview domains and localhost if needed. Maps load only when mounted.
- `VITE_POSTHOG_KEY`: the PostHog project ingestion key (not a personal API key).
- `VITE_POSTHOG_HOST=https://eu.i.posthog.com`: European ingestion endpoint.

Place entry is manual: enter the name, address, phone, website and opening hours, then pick the exact coordinates on Mapbox. Branch edits are saved only after pressing Save. There is no Google Places search, geocoding, or automated enrichment. CSV/Sheets previews preserve supplied details and flag missing fields. Existing external directions links and stored place IDs remain intact for data compatibility.

PostHog records explicit page views and selected interactions without autocapture, session recordings, personal profiles, raw search text, or admin/auth pages. It respects Do Not Track and uses memory-only identity. Existing first-party admin reports remain the source of truth; PostHog is a separate product analytics view, not a migration of historical Google Analytics data.

## Product scope

### Admin-controlled subscriptions

`/admin/subscriptions` manages business assignments and shared Free/Pro/Premium definitions, without billing. Edit a business plan using Current Plan, select a tier, then Apply. Edit shared branch/photo/description limits, extra contact links and analytics access in the plan definitions tab. Every business resolves its entitlements from `public.subscription_plans`; no per-business feature switches are copied.

Apply `20260908222749_managed_subscription_plans.sql` before deploying this feature. Plan writes require an authenticated admin and RLS, with revision checks preventing concurrent edits from silently overwriting each other. Database triggers reconcile branch visibility on assignment and definition changes. Excess branches are hidden, never deleted; upgrades restore only automatically hidden branches. Basic phone/social details remain available, search ranking remains Premium → Pro → Free, and automatic report delivery is not implemented.

Default branch limits are Free: 1, Pro: 3, Premium: unlimited. Definition updates take effect on subsequent data loads; the admin catalog refreshes every 30 seconds. Test coverage includes a rollback-only database scenario for upgrades, downgrades, shared limit changes, restoration and non-admin access denial, alongside `npm test`.

The platform helps visitors discover trusted gluten-free options and contact or book with businesses. Payments are not processed inside Pure Table.
