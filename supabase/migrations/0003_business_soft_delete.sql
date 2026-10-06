-- ============================================================================
-- 0003: Owner-visible soft-delete for businesses.
-- Businesses are never hard-deleted; we mark deleted_at and hide them.
-- Run after 0002. Safe to re-run.
-- ============================================================================

alter table public.businesses
  add column if not exists deleted_at timestamptz;

create index if not exists businesses_deleted_idx
  on public.businesses(deleted_at);

-- Owners (and admins) may update their own business, which includes setting
-- deleted_at. The existing businesses_update policy already allows this, so no
-- new policy is required. We intentionally add NO hard-delete policy.
