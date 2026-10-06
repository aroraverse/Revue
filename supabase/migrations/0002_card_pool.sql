-- ============================================================================
-- 0002: Reverse the card pipeline.
-- Cards are now pre-minted into an UNASSIGNED pool (no business yet), their QR
-- codes printed, then later ASSIGNED to a business. Run after 0001.
-- Safe to re-run.
-- ============================================================================

-- 1) Allow 'unassigned' as a card status.
--    Postgres enums can't easily have values removed, so we add one.
do $$ begin
  alter type card_status add value if not exists 'unassigned';
exception when duplicate_object then null; end $$;

-- 2) business_id becomes nullable (a card can exist with no business).
alter table public.cards
  alter column business_id drop not null;

-- 3) A sequence to mint global, never-reused tokens (A001, A002, ...).
--    Starts after any tokens that may already exist.
create sequence if not exists public.card_token_seq;

do $$
declare
  current_max int;
begin
  select coalesce(max((regexp_replace(public_token, '\D', '', 'g'))::int), 0)
    into current_max
  from public.cards
  where public_token ~ '\d';

  -- Set the sequence so the next value is current_max + 1.
  perform setval('public.card_token_seq', greatest(current_max, 0), true);
end $$;

-- 4) Helper to mint the next token as 'A' + zero-padded number.
create or replace function public.next_card_token()
returns text
language sql
as $$
  select 'A' || lpad(nextval('public.card_token_seq')::text, 3, '0');
$$;

-- 5) RLS: admins mint and assign cards. Replace the owner-scoped insert/update
--    with admin-only management, since cards now start life with no owner.
--    Owners still SELECT cards for businesses they own (unchanged policy below
--    re-created to also allow reading unassigned cards for admins only).

drop policy if exists cards_insert on public.cards;
create policy cards_insert on public.cards
  for insert with check (public.is_admin());

drop policy if exists cards_update on public.cards;
create policy cards_update on public.cards
  for update using (
    public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
  )
  with check (
    public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
  );

drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
  for select using (
    public.is_admin()
    or (business_id is not null and public.owns_business(business_id))
  );
