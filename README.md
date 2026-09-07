# Pure Table Finder

Pure Table is a bilingual directory for finding gluten-free restaurants, cafes, bakeries, desserts, supermarkets, and home businesses across Saudi Arabia.

## Technology

- React 19 and TanStack Start
- Vite and Nitro
- Supabase Database, Auth, and Storage
- Google Maps JavaScript API and Places API
- Tailwind CSS
- Model Context Protocol TypeScript SDK

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and provide the required values.
3. Start the app with `npm run dev`.

Environment files containing real credentials are intentionally ignored by Git. Only `.env.example` should be committed.

## Production

Build with `npm run build`. The Nitro server output is compatible with standard Node.js hosting and platforms such as Vercel. Configure all values from `.env.example` in the hosting provider rather than committing them.

Google Maps uses two separate keys in production:

- `VITE_GOOGLE_MAPS_API_KEY` is public and restricted by the site's HTTP referrers to Maps JavaScript API.
- `GOOGLE_MAPS_API_KEY` is server-only and restricted to Places API (New). Do not apply browser-referrer restrictions to this key, because server requests have no browser referrer.

The admin Google Maps preview accepts a place name or an official Google Maps link. Search, duplicate checks, and previews are read-only; selected data is persisted only by an explicit Save action.

## Product scope

The platform helps visitors discover trusted gluten-free options and contact or book with businesses. Payments are not processed inside Pure Table.
