# ReviewTap

A mobile-first review funnel. Each physical **QR/NFC card** opens a review page,
collects the customer's genuine experience, drafts a comment from it, and sends
them to the business's official **Google review** page.

Built to run entirely on **free tiers**: Next.js (App Router) + TypeScript +
Tailwind, Supabase (Postgres + Auth), deployed on Vercel. No paid APIs, no AI
keys, no third-party QR service — QR codes are generated locally with the
`qrcode` npm package (error correction level **H**, SVG + PNG).

---

## How it works

- A card has a permanent short token (e.g. `A001`). It is **never reused or deleted**.
- QR codes encode `https://YOUR_DOMAIN/c/{token}?s=q`.
- NFC tags are written with `https://YOUR_DOMAIN/c/{token}?s=n`.
- `/c/[token]` looks up the card **server-side**, logs an event (`QR` / `NFC` /
  `UNKNOWN`), then renders the review page.
- Customer picks 1-5 stars, ticks tags, optionally adds a one-line note.
  - **4-5 stars** → a draft comment is generated (editable, with *Regenerate*).
    *Copy & open Google* copies the text, logs a `GOOGLE_CLICK`, and opens the
    business's Google review page.
  - **1-3 stars** → *Tell the owner privately* saves feedback and shows a
    thank-you. A secondary *Post on Google instead* button is **always present**.
- Every completed submission saves a `feedback` row (stars, tags, note, draft)
  so owners see everything.

### "Card never dies" guarantees

- Static QR encoding our own URL — no external QR service, ever.
- Cards and businesses are **soft-disabled**, never hard-deleted. Tokens are
  never reused.
- Disabled / unknown cards render a friendly branded page — never a raw 404.
- The redirect depends only on our own DB. On a DB error the page shows a
  **Try again** button.
- Changing `google_review_url` applies instantly to every existing card
  (it is read live on each visit).
- The domain comes from a single env var: `NEXT_PUBLIC_BASE_URL`.

---

## Project structure

```
app/
  c/[token]/            Customer review page (server) + ReviewFlow (client)
  admin/
    login/              Email/password sign in
    (dashboard)/        Guarded admin area (layout redirects if no session)
      page.tsx          Business list + create
      business/[id]/    Edit, analytics, cards (QR/NFC), feedback inbox
      export/route.ts   CSV backup download (RLS-scoped)
  api/keepalive/        Daily cron target (keeps Supabase awake)
lib/
  compose.ts            Pure draft generator (no AI/API) + tests
  tags.ts               Tag sets per business type
  qr.ts                 URL + QR (SVG/PNG, ECC H) helpers
  analytics.ts          Event aggregation (7/30/all)
  auth.ts               Current user + role
  supabase/             admin (service role), server (SSR), client (browser)
  types.ts              Shared types
supabase/migrations/    SQL schema + RLS
scripts/seed.mjs        Demo business + cards A001-A003
```

---

## 1. Supabase setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql),
   and **Run**. This creates all tables, RLS policies, helper functions, and a
   trigger that auto-creates a `profiles` row (role `owner`) for each new user.
3. **Auth → Providers → Email**: ensure Email is enabled. For a quick start you
   can disable "Confirm email" so you can log in immediately.
4. Create your admin user: **Authentication → Users → Add user** (email +
   password). To make this user an **admin** (sees all businesses), run:
   ```sql
   update public.profiles set role = 'admin'
   where user_id = (select id from auth.users where email = 'you@example.com');
   ```
   Leave it as the default `owner` if the user should only see their own
   businesses.
5. Grab your keys from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server only)

---

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
CRON_SECRET=some-long-random-string
```

- `NEXT_PUBLIC_BASE_URL` — no trailing slash. In production set it to your real
  domain (e.g. `https://reviewtap.example.com`) so QR/NFC links are correct.
- `SUPABASE_SERVICE_ROLE_KEY` — **never** exposed to the browser. Used only for
  anonymous event/feedback logging, the keepalive cron, and the seed script.
- `CRON_SECRET` — the keepalive route rejects requests without
  `Authorization: Bearer <CRON_SECRET>`.

---

## 3. Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # runs lib/compose.ts unit tests
npm run seed         # optional: demo business + cards A001-A003
```

- Admin dashboard: `http://localhost:3000/admin`
- A seeded card: `http://localhost:3000/c/A001?s=q`

---

## 4. Deploy to Vercel

1. Push this repo to GitHub/GitLab.
2. [vercel.com](https://vercel.com) → **New Project** → import the repo.
   Framework preset: **Next.js** (auto-detected).
3. Add the same environment variables (Project → **Settings → Environment
   Variables**). Set `NEXT_PUBLIC_BASE_URL` to your production URL.
4. Deploy. `vercel.json` registers a **daily cron** that calls
   `/api/keepalive` at 06:00 UTC. Vercel automatically sends the
   `Authorization: Bearer <CRON_SECRET>` header, so set `CRON_SECRET` in Vercel
   too.

### Attach a custom domain

1. Vercel → Project → **Settings → Domains → Add**. Enter your domain.
2. At your registrar, add the DNS records Vercel shows (an `A`/`ALIAS` record
   for an apex domain, or a `CNAME` to `cname.vercel-dns.com` for a subdomain).
3. Once the domain is verified, update `NEXT_PUBLIC_BASE_URL` to that domain and
   redeploy, so newly generated QR/NFC links use it.
   (Existing cards keep working — only the encoded base URL changes for new
   downloads.)

---

## 5. Create cards and get QR / NFC

In **/admin → a business**:

- **+ Add card** auto-generates the next token (`A001`, `A002`, …).
- Per card you can **Download SVG**, **Download PNG**, **Copy QR URL**
  (`?s=q`), and **Copy NFC URL** (`?s=n`), plus **Enable/Disable**.

### Writing the NFC URL to a tag

1. Copy the card's **NFC URL** (ends with `?s=n`).
2. On a phone, install an NFC writer app
   (e.g. *NFC Tools* on Android/iOS).
3. Choose **Write → Add a record → URL/URI**, paste the NFC URL, then tap a
   blank NTAG213/215/216 tag to write it.
4. Lock the tag if your app supports it, to prevent overwriting.

Now tapping the tag opens the review page and logs an `NFC` event; scanning the
printed QR logs a `QR` event.

---

## Roles & privacy (RLS)

- **Admin** sees every business, card, event and feedback.
- **Owner** sees only their own business's data. Enforced by Postgres Row Level
  Security — not just in the UI.
- Customers are anonymous; their event/feedback writes go through a server
  action using the service role, so no public write access to the DB is exposed.

---

## Notes

- `npm run build` and `npm test` both pass. The customer page and admin pages
  are server-rendered on demand (dynamic) because they read live DB state.
- The draft generator is a pure function in `lib/compose.ts`: it only reflects
  what the customer selected or typed (the note is included verbatim), varies
  on each *Regenerate*, and uses the business name/type only as context words.
