# ReviewTap — Developer Notes

Internal reference for developers. For setup/deploy, see `README.md`.

## Stack
- Next.js 15 (App Router) + TypeScript, Tailwind CSS
- Supabase (Postgres + Auth), RLS-enforced
- QR codes generated locally with `qrcode` (ECC level **H**) — no third-party service
- Deployed on Vercel (free tier); daily cron keeps Supabase awake

## Roles
- **admin** — sees/manages everything (all businesses, card pool, users, export).
- **owner** — sees only their own business: analytics + feedback inbox (read-only).
- Role lives in two places: `profiles.role` (source of truth) and the JWT
  `app_metadata.role` (fast path). `getCurrentUser()` reads the token first and
  only falls back to a `profiles` query if the token has no role.

## Data model (see `supabase/migrations/`)
- `profiles(user_id, role)` — trigger auto-creates on signup (default `owner`).
- `businesses(..., owner_user_id, deleted_at)` — soft-delete via `deleted_at`.
- `cards(public_token UNIQUE, business_id NULLABLE, status)` — status is
  `unassigned | active | disabled`. Tokens minted from `card_token_seq`
  (`next_card_token()` → `A001`, `A002`, …) and never reused.
- `events(card_id, business_id, type, created_at)` — append-only analytics.
- `feedback(business_id, stars, tags[], note, draft_comment)` — one row per
  completed submission.
- RLS: admin = all; owner = own via `owns_business()`. Writes from the customer
  flow use the service-role client (anonymous visitors).

### Migrations (run in order in Supabase SQL editor)
- `0001_init.sql` — tables, enums, RLS, signup trigger.
- `0002_card_pool.sql` — unassigned pool, nullable `business_id`, token sequence.
- `0003_business_soft_delete.sql` — `businesses.deleted_at`.

## Card pipeline (pre-mint → assign)
1. Admin mints a batch of blank cards (`/admin/cards`) → tokens auto-generated.
2. Print QR sheet (`/admin/cards/print`, filter all/unassigned/assigned).
3. Admin assigns a card to a business → status becomes `active`.
Customer `/c/[token]`: unassigned / disabled / soft-deleted business all render
a friendly branded page (never a raw 404).

## Routes
- `/c/[token]` — customer review flow (server lookup + event log, then client UI).
- `/admin/login` — email/password sign-in.
- `/admin/(dashboard)/` — guarded layout (two-tier header: logo on top, tabs below).
  - `/admin` — business list (admin) or redirect to the single business (owner).
  - `/admin/business/new` — create (admin only).
  - `/admin/business/[id]` — role-aware: owner sees analytics + feedback only;
    admin also sees edit form, delete, and assigned cards.
  - `/admin/business/[id]/feedback` — RLS-scoped inbox.
  - `/admin/cards` + `/admin/cards/print` — pool management + printable sheet.
  - `/admin/users` — admin provisions owner logins.
  - `/admin/export` — CSV backup (admin only).
  - `/admin/qr/[token]` — on-demand QR image (PNG, or `?format=svg`), cached 24h.
- `/api/keepalive` — daily cron; guarded by `Authorization: Bearer CRON_SECRET`.

## Server actions (`app/admin/(dashboard)/business-actions.ts`)
All mutations call `requireAdmin()` (defense in depth beyond RLS):
`createBusiness`, `updateBusiness`, `deleteBusiness` (soft), `mintCards`,
`assignCard`, `unassignCard`, `setCardStatus`, `createOwnerUser`.

## Performance design (why it's fast)
- `getCurrentUser()` wrapped in React `cache()` — one auth resolution per
  request shared by layout + page.
- Reads user from `getSession()` (local JWT, no network); middleware already
  validated/refreshed the session, so this is safe.
- Role read from JWT `app_metadata.role` → usually zero DB hits for auth.
- Middleware uses `getSession()` (network refresh only near token expiry) and
  skips the `/admin/qr/` image route.
- `getBusinessAnalytics()` wrapped in `unstable_cache` (30s TTL, tag
  `analytics:<businessId>`) — avoids re-scanning all events each visit.
- `baseUrl()` memoized per request.
- `loading.tsx` skeletons on dashboard / business / cards for instant feedback.

## UI/UX
- Design tokens in `app/globals.css`: `.surface`, `.btn-primary`, `.btn-ghost`,
  `.field`. Gradient background, sticky frosted header, active-tab highlighting
  (`NavTabs.tsx`), responsive/mobile-first, reduced-motion guard.

## Gotchas / notes
- Next 15: `cookies()`, `params`, `searchParams` are async — always `await`.
- `NEXT_PUBLIC_*` are inlined at build time; `baseUrl()` falls back to the live
  request host so QR links stay correct even if the env var is wrong.
- Existing admin created manually in Supabase has no `app_metadata.role` yet,
  so it uses the profiles fallback. To put it on the fast path, run:
  ```sql
  -- replace the email
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
  where email = 'you@example.com';
  ```
  New owner logins created via `/admin/users` already get `app_metadata.role`.
- QR codes are static (encode a permanent URL); changing `google_review_url`
  applies instantly to every existing card.

## Verify
- `npm run build` — type-check + production build.
- `npm test` — `lib/compose.ts` unit tests (Node test runner, TS strip types).
