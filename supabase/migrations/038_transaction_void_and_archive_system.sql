-- ==============================================================================
-- Migration 038: Transaction Void and Archive Soft-Delete System
-- ==============================================================================
-- Description:
-- Replaces physical row deletions with standard accounting soft-delete / voiding.
-- Transactions marked with status = 'VOIDED' are excluded from active cash on hand,
-- balance calculations, and reports, while maintaining full immutable auditability.
-- ==============================================================================

-- 1. Extend transaction_status enum with 'VOIDED'
ALTER TYPE transaction_status ADD VALUE IF NOT EXISTS 'VOIDED';

-- 2. Add archival and voiding metadata columns to public.transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.profiles(id) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS void_reason TEXT DEFAULT NULL;

COMMENT ON COLUMN public.transactions.archived_at IS 'Timestamp when transaction was voided/archived';
COMMENT ON COLUMN public.transactions.archived_by IS 'Profile ID of officer who voided/archived the transaction';
COMMENT ON COLUMN public.transactions.void_reason IS 'Audited explanation for voiding the entry (e.g. clerical error, duplicate)';

-- 2. Create index for fast filtering of active vs voided records
CREATE INDEX IF NOT EXISTS idx_transactions_status_archived 
  ON public.transactions (status, semester_id);
