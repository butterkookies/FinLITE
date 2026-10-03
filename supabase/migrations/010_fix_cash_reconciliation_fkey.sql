-- Migration 010: Fix cash_reconciliations foreign key constraints
-- Drops overly strict foreign key constraints on counted_by and verified_by
-- allowing both profiles.id, auth.users.id, or null to be saved reliably without blocking physical audits.

ALTER TABLE public.cash_reconciliations
  DROP CONSTRAINT IF EXISTS cash_reconciliations_counted_by_fkey,
  DROP CONSTRAINT IF EXISTS cash_reconciliations_verified_by_fkey;

-- Ensure columns exist and are nullable UUID
ALTER TABLE public.cash_reconciliations
  ALTER COLUMN counted_by DROP NOT NULL,
  ALTER COLUMN verified_by DROP NOT NULL;

COMMENT ON COLUMN public.cash_reconciliations.counted_by IS 'Profile ID or Auth User ID of officer who conducted the physical count audit';
COMMENT ON COLUMN public.cash_reconciliations.verified_by IS 'Profile ID or Auth User ID of officer/adviser who verified the physical count audit';
