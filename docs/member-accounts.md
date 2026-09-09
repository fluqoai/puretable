# Member accounts

- Public sign-in/sign-up: `/auth`. Successful sign-in goes to `/profile`.
- If email confirmation is enabled, registration sends a confirmation link to the profile. A session is required to access personal data.
- Admin sign-in only: `/admin-login`. There is no admin sign-up or automatic role claiming. Admin roles must be assigned through trusted backend administration.
- `/profile` includes private name/city/avatar, saved places, and password settings. A business context passed into sign-in is offered as a return link after landing on the profile.
- Existing admin accounts remain unchanged. Being a member, or setting role-like user metadata, does not grant administration rights.

## Database and storage

Migration `20260909095931_member_profiles.sql` creates a private profile for each Auth user, including existing users. Only the owner can read/update it; client writes cannot change identity or creation time.

Avatars use the private `member-avatars` bucket, at `{user-id}/avatar`, with JPEG/PNG/WebP and a 2 MiB limit. Access is governed by owner-path policies. The UI uses expiring signed URLs.

Favorites remain in the existing RLS-protected table. Duplicate saves are ignored and query caches are keyed by user. Unpublished places remain saved but are not displayed publicly.

## Verification

- `npm test`
- `npx tsc --noEmit`
- `npm run build`
- `node --env-file=.env.local scripts/verify-members.mjs`

The last command uses local backend credentials without CLI authentication, creates isolated test accounts, checks profile/favorite/avatar isolation and blocked admin escalation, then deletes its own test accounts and files. Never run it with credentials for a different project.

## Email delivery

Configure a production SMTP provider in Supabase before opening registration at scale. The default mail service has strict sending limits. Do not disable confirmation or weaken password policies to work around delivery failures. The configured Site URL and redirect allowlist must include the production domain. Never commit service-role credentials or user passwords.
