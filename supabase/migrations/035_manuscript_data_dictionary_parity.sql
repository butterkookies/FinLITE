-- ==============================================================================
-- FinLITE Database Migration 035: Manuscript Data Dictionary Parity (Tables 1-18)
-- Aligns live Supabase PostgreSQL schema with Section 2.2.2 Data Dictionary
-- (Tables 1-18, pp. 13-17) and ERD Figure 13 while preserving 100% backward
-- compatibility with all runtime Next.js queries and triggers.
-- ==============================================================================

-- 0. Safely extend user_role enum if it exists in PostgreSQL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'vice_president';
  END IF;
EXCEPTION
  WHEN others THEN NULL;
END $$;

BEGIN;

-- ==============================================================================
-- 1. Table 1: Profiles — Boolean Permission Columns & Sync Trigger
-- ==============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_record_inflows BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_record_outflows BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_edit_transactions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_audit_transactions BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_debts BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_advances BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_reconcile_cash BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_generate_reports BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_sync_profile_permission_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role TEXT := lower(COALESCE(NEW.role::text, ''));
  v_perms JSONB := COALESCE(NEW.permissions, '{}'::jsonb);
BEGIN
  NEW.can_record_inflows := COALESCE(
    (v_perms->>'record_inflow')::boolean,
    v_role IN ('admin', 'president', 'vice_president', 'treasurer')
  );
  NEW.can_record_outflows := COALESCE(
    (v_perms->>'record_outflow')::boolean,
    v_role IN ('admin', 'president', 'vice_president', 'treasurer')
  );
  NEW.can_edit_transactions := COALESCE(
    (v_perms->>'edit_transaction')::boolean,
    v_role IN ('admin', 'president', 'vice_president')
  );
  NEW.can_audit_transactions := COALESCE(
    (v_perms->>'audit_approve')::boolean,
    v_role IN ('admin', 'auditor')
  );
  NEW.can_manage_debts := COALESCE(
    (v_perms->>'record_inflow')::boolean,
    v_role IN ('admin', 'president', 'vice_president', 'treasurer')
  );
  NEW.can_manage_advances := COALESCE(
    (v_perms->>'record_abono')::boolean,
    v_role IN ('admin', 'president', 'vice_president', 'treasurer')
  );
  NEW.can_reconcile_cash := COALESCE(
    (v_perms->>'cash_reconciliation')::boolean,
    v_role IN ('admin', 'treasurer', 'auditor')
  );
  NEW.can_generate_reports := COALESCE(
    (v_perms->>'export_reports')::boolean,
    v_role IN ('admin', 'president', 'vice_president', 'treasurer', 'auditor', 'adviser')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_permission_columns ON public.profiles;
CREATE TRIGGER trg_sync_profile_permission_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_profile_permission_columns();

-- Backfill existing profiles
UPDATE public.profiles SET updated_at = COALESCE(updated_at, NOW());

-- ==============================================================================
-- 2. Table 8: Transactions — Data Dictionary Columns & Sync Trigger
-- ==============================================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS audited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payer_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS claimant_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE OR REPLACE FUNCTION public.fn_sync_transactions_dictionary_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.payment_method := COALESCE(NULLIF(NEW.payment_method, ''), 'CASH');

  -- Sync audited_by <-> reviewed_by if reviewed_by exists via JSONB inspection
  IF NEW.audited_by IS NULL AND (to_jsonb(NEW)->>'reviewed_by') IS NOT NULL THEN
    NEW.audited_by := (to_jsonb(NEW)->>'reviewed_by')::uuid;
  END IF;

  IF NEW.audited_at IS NULL AND (to_jsonb(NEW)->>'reviewed_at') IS NOT NULL THEN
    NEW.audited_at := (to_jsonb(NEW)->>'reviewed_at')::timestamptz;
  END IF;

  -- Sync claimant_name <-> reimbursement_recipient
  IF NEW.claimant_name IS NULL AND NEW.reimbursement_recipient IS NOT NULL THEN
    NEW.claimant_name := NEW.reimbursement_recipient;
  ELSIF NEW.reimbursement_recipient IS NULL AND NEW.claimant_name IS NOT NULL THEN
    NEW.reimbursement_recipient := NEW.claimant_name;
  END IF;

  -- Sync notes <-> description fallback
  IF NEW.notes IS NULL AND NEW.description IS NOT NULL THEN
    NEW.notes := NEW.description;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_transactions_dictionary_columns ON public.transactions;
CREATE TRIGGER trg_sync_transactions_dictionary_columns
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_transactions_dictionary_columns();

-- ==============================================================================
-- 3. Table 9 & Table 13: Transaction_Receipts & Advance_Receipts
-- ==============================================================================
ALTER TABLE public.transaction_receipts
  ADD COLUMN IF NOT EXISTS public_url TEXT,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS file_size INT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.fn_sync_transaction_receipts_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.public_url IS NULL AND (to_jsonb(NEW)->>'file_url') IS NOT NULL THEN
    NEW.public_url := to_jsonb(NEW)->>'file_url';
  END IF;
  IF NEW.sort_order IS NULL THEN
    NEW.sort_order := COALESCE((to_jsonb(NEW)->>'display_order')::int, 0);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_transaction_receipts_columns ON public.transaction_receipts;
CREATE TRIGGER trg_sync_transaction_receipts_columns
  BEFORE INSERT OR UPDATE ON public.transaction_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_transaction_receipts_columns();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'advance_receipts') THEN
    ALTER TABLE public.advance_receipts
      ADD COLUMN IF NOT EXISTS public_url TEXT,
      ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ==============================================================================
-- 4. Table 10: Transaction_Comments — author_id & comment_text Sync
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_comments') THEN
    ALTER TABLE public.transaction_comments
      ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS comment_text TEXT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_sync_transaction_comments_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.author_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.author_id := NEW.user_id;
  ELSIF NEW.user_id IS NULL AND NEW.author_id IS NOT NULL THEN
    NEW.user_id := NEW.author_id;
  END IF;

  IF NEW.comment_text IS NULL AND NEW.content IS NOT NULL THEN
    NEW.comment_text := NEW.content;
  ELSIF NEW.content IS NULL AND NEW.comment_text IS NOT NULL THEN
    NEW.content := NEW.comment_text;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_comments') THEN
    DROP TRIGGER IF EXISTS trg_sync_transaction_comments_columns ON public.transaction_comments;
    CREATE TRIGGER trg_sync_transaction_comments_columns
      BEFORE INSERT OR UPDATE ON public.transaction_comments
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_sync_transaction_comments_columns();
  END IF;
END $$;

-- ==============================================================================
-- 5. Table 12 & Table 15: Advance_Disbursements & Debt_Payments — payment_method
-- ==============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'advance_disbursements') THEN
    ALTER TABLE public.advance_disbursements
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'debt_payments') THEN
    ALTER TABLE public.debt_payments
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';
  END IF;
END $$;

-- ==============================================================================
-- 6. Table 17: Cash_Reconciliations — Data Dictionary Columns & Sync Trigger
-- ==============================================================================
ALTER TABLE public.cash_reconciliations
  ADD COLUMN IF NOT EXISTS ledger_cash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS variance_status VARCHAR(20) NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN IF NOT EXISTS adviser_approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'VERIFIED';

CREATE OR REPLACE FUNCTION public.fn_sync_cash_reconciliations_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ledger_cash_balance = 0 AND (to_jsonb(NEW)->>'ledger_balance') IS NOT NULL THEN
    NEW.ledger_cash_balance := COALESCE((to_jsonb(NEW)->>'ledger_balance')::numeric, 0);
  END IF;

  IF NEW.variance_amount = 0 AND (to_jsonb(NEW)->>'variance') IS NOT NULL THEN
    NEW.variance_amount := COALESCE((to_jsonb(NEW)->>'variance')::numeric, 0);
  END IF;

  IF NEW.adviser_approval_notes IS NULL AND (to_jsonb(NEW)->>'adviser_notes') IS NOT NULL THEN
    NEW.adviser_approval_notes := to_jsonb(NEW)->>'adviser_notes';
  END IF;

  IF NEW.variance_status IS NULL OR NEW.variance_status = '' THEN
    IF NEW.variance_amount < 0 THEN
      NEW.variance_status := 'SHORTAGE';
    ELSIF NEW.variance_amount > 0 THEN
      NEW.variance_status := 'OVERAGE';
    ELSE
      NEW.variance_status := 'BALANCED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_cash_reconciliations_columns ON public.cash_reconciliations;
CREATE TRIGGER trg_sync_cash_reconciliations_columns
  BEFORE INSERT OR UPDATE ON public.cash_reconciliations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_cash_reconciliations_columns();

COMMIT;
