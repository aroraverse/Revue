-- ============================================================================
-- ReviewTap schema + Row Level Security
-- Run this in the Supabase SQL editor (Dashboard -> SQL -> New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type business_type as enum
    ('restaurant','cafe','salon','clinic','retail','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type card_status as enum ('active','disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('QR','NFC','GOOGLE_CLICK','UNKNOWN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_role as enum ('admin','owner');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles: maps an auth user to a role. One row per user.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'owner',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- businesses
-- ----------------------------------------------------------------------------
create table if not exists public.businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  type              business_type not null default 'other',
  summary           text,
  logo_url          text,
  google_review_url text not null,
  owner_user_id     uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists businesses_owner_idx
  on public.businesses(owner_user_id);

-- ----------------------------------------------------------------------------
-- cards: public_token is permanent and never reused. Soft status only.
-- ----------------------------------------------------------------------------
create table if not exists public.cards (
  id           uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  business_id  uuid not null references public.businesses(id) on delete restrict,
  status       card_status not null default 'active',
  created_at   timestamptz not null default now()
);
create index if not exists cards_business_idx on public.cards(business_id);
create index if not exists cards_token_idx    on public.cards(public_token);

-- ----------------------------------------------------------------------------
-- events: append-only analytics log.
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  card_id     uuid references public.cards(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  type        event_type not null,
  created_at  timestamptz not null default now(),
  user_agent  text,
  referrer    text
);
create index if not exists events_business_idx on public.events(business_id);
create index if not exists events_card_idx     on public.events(card_id);
create index if not exists events_created_idx  on public.events(created_at);

-- ----------------------------------------------------------------------------
-- feedback: one row per completed submission (all star levels).
-- ----------------------------------------------------------------------------
create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  card_id       uuid references public.cards(id) on delete set null,
  business_id   uuid not null references public.businesses(id) on delete cascade,
  stars         int  not null check (stars between 1 and 5),
  tags          text[] not null default '{}',
  note          text,
  draft_comment text,
  created_at    timestamptz not null default now()
);
create index if not exists feedback_business_idx on public.feedback(business_id);
create index if not exists feedback_created_idx  on public.feedback(created_at);

-- ============================================================================
-- Helper functions (SECURITY DEFINER so policies can read profiles safely)
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.owns_business(b_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.businesses b
    where b.id = b_id and b.owner_user_id = auth.uid()
  );
$$;

-- ============================================================================
-- Enable RLS
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.businesses enable row level security;
alter table public.cards      enable row level security;
alter table public.events     enable row level security;
alter table public.feedback   enable row level security;

-- ----------------------------------------------------------------------------
-- profiles policies
--   A user can read their own profile. Admins can read all.
--   Writes are done server-side with the service role (bypasses RLS).
-- ----------------------------------------------------------------------------
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------------------------
-- businesses policies: admin = all; owner = own rows.
-- ----------------------------------------------------------------------------
drop policy if exists businesses_select on public.businesses;
create policy businesses_select on public.businesses
  for select using (public.is_admin() or owner_user_id = auth.uid());

drop policy if exists businesses_insert on public.businesses;
create policy businesses_insert on public.businesses
  for insert with check (public.is_admin() or owner_user_id = auth.uid());

drop policy if exists businesses_update on public.businesses;
create policy businesses_update on public.businesses
  for update using (public.is_admin() or owner_user_id = auth.uid())
  with check (public.is_admin() or owner_user_id = auth.uid());

-- No delete policy: businesses are never hard-deleted.

-- ----------------------------------------------------------------------------
-- cards policies: admin = all; owner = cards of businesses they own.
-- ----------------------------------------------------------------------------
drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
  for select using (public.is_admin() or public.owns_business(business_id));

drop policy if exists cards_insert on public.cards;
create policy cards_insert on public.cards
  for insert with check (public.is_admin() or public.owns_business(business_id));

drop policy if exists cards_update on public.cards;
create policy cards_update on public.cards
  for update using (public.is_admin() or public.owns_business(business_id))
  with check (public.is_admin() or public.owns_business(business_id));

-- No delete policy: cards are never hard-deleted (status only).

-- ----------------------------------------------------------------------------
-- events policies: admin = all; owner = events for their businesses.
--   Inserts come from the server via the service role (anonymous customers),
--   so no public insert policy is needed.
-- ----------------------------------------------------------------------------
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select using (public.is_admin() or public.owns_business(business_id));

-- ----------------------------------------------------------------------------
-- feedback policies: admin = all; owner = feedback for their businesses.
--   Inserts come from the server via the service role, so no public insert.
-- ----------------------------------------------------------------------------
drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback
  for select using (public.is_admin() or public.owns_business(business_id));

-- ============================================================================
-- Auto-create a profile row when a new auth user signs up (default: owner).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'owner')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
