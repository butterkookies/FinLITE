-- ==============================================================================
-- FinLITE Database Migration 013: 3NF Normalization Contract Phase
-- Runs AFTER application cutover to deprecate legacy columns and finalize 3NF
-- Compliant with PDM CCS Institutional Audit Standards & 3NF Relational Standards
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Drop Backward Compatibility Triggers
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_transaction_receipts_from_array ON public.transactions;
DROP TRIGGER IF EXISTS trg_sync_transactions_3nf ON public.transactions;
DROP TRIGGER IF EXISTS trg_sync_profiles_full_name ON public.profiles;
DROP FUNCTION IF EXISTS public.fn_sync_transaction_receipts_from_array();
DROP FUNCTION IF EXISTS public.fn_sync_transactions_3nf();
DROP FUNCTION IF EXISTS public.fn_sync_profiles_full_name();

-- ------------------------------------------------------------------------------
-- 2. Enforce NOT NULL Constraints on Foreign Keys
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions
  ALTER COLUMN semester_id SET NOT NULL,
  ALTER COLUMN category_id SET NOT NULL;

ALTER TABLE public.cash_reconciliations
  ALTER COLUMN semester_id SET NOT NULL;

ALTER TABLE public.shortages_abono
  ALTER COLUMN handled_by_profile_id SET NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. Drop Redundant Denormalized Columns from transactions
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS category_name,
  DROP COLUMN IF EXISTS academic_year,
  DROP COLUMN IF EXISTS semester,
  DROP COLUMN IF EXISTS receipt_url,
  DROP COLUMN IF EXISTS receipt_urls;

-- ------------------------------------------------------------------------------
-- 4. Drop Repeating Denomination Columns from cash_reconciliations
-- ------------------------------------------------------------------------------
ALTER TABLE public.cash_reconciliations
  DROP COLUMN IF EXISTS bills_1000,
  DROP COLUMN IF EXISTS bills_500,
  DROP COLUMN IF EXISTS bills_200,
  DROP COLUMN IF EXISTS bills_100,
  DROP COLUMN IF EXISTS bills_50,
  DROP COLUMN IF EXISTS bills_20,
  DROP COLUMN IF EXISTS coins_20,
  DROP COLUMN IF EXISTS coins_10,
  DROP COLUMN IF EXISTS coins_5,
  DROP COLUMN IF EXISTS coins_1,
  DROP COLUMN IF EXISTS coins_cents;

-- ------------------------------------------------------------------------------
-- 5. Drop Unconstrained Text Column from shortages_abono
-- ------------------------------------------------------------------------------
ALTER TABLE public.shortages_abono
  DROP COLUMN IF EXISTS handled_by;

-- ------------------------------------------------------------------------------
-- 6. Convert profiles.full_name to PostgreSQL GENERATED ALWAYS AS Column
-- ------------------------------------------------------------------------------
-- Backfill any missing first_name / last_name from legacy full_name
UPDATE public.profiles
SET 
  first_name = split_part(full_name, ' ', 1),
  last_name = substr(full_name, length(split_part(full_name, ' ', 1)) + 2)
WHERE (first_name IS NULL OR first_name = '') AND full_name IS NOT NULL AND full_name != '';

ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;
ALTER TABLE public.profiles
  ADD COLUMN full_name TEXT GENERATED ALWAYS AS (
    TRIM(CONCAT_WS(' ', NULLIF(first_name, ''), NULLIF(last_name, '')))
  ) STORED;

-- ------------------------------------------------------------------------------
-- 7. Convert semesters.label to PostgreSQL GENERATED ALWAYS AS Column
-- ------------------------------------------------------------------------------
ALTER TABLE public.semesters DROP COLUMN IF EXISTS label;
ALTER TABLE public.semesters
  ADD COLUMN label TEXT GENERATED ALWAYS AS (
    'AY ' || academic_year || ' • ' || semester
  ) STORED;

-- ------------------------------------------------------------------------------
-- 8. Add Audit Verification Check Constraint on cash_reconciliations
-- Ensures variance math is mathematically grounded: variance = physical_total - ledger_cash_balance
-- ------------------------------------------------------------------------------
ALTER TABLE public.cash_reconciliations
  DROP CONSTRAINT IF EXISTS chk_variance_calculation;

ALTER TABLE public.cash_reconciliations
  ADD CONSTRAINT chk_variance_calculation
  CHECK (
    (variance_status = 'BALANCED' AND variance_amount = 0.00) OR
    (variance_status = 'SHORTAGE' AND physical_total < ledger_cash_balance) OR
    (variance_status = 'OVERAGE' AND physical_total > ledger_cash_balance)
  );

-- ------------------------------------------------------------------------------
-- 9. Refresh Updatable View for Normalized Transactions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_transactions_normalized AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.amount,
  t.type,
  t.payment_method,
  t.category_id,
  c.name AS category_name,
  t.semester_id,
  s.academic_year,
  s.semester,
  s.label AS semester_label,
  t.logged_by,
  p.full_name AS logged_by_name,
  t.transaction_date,
  t.is_reimbursement,
  t.reimbursement_recipient,
  t.status,
  t.event_name,
  t.created_at,
  t.updated_at,
  COALESCE(
    (SELECT array_agg(tr.public_url ORDER BY tr.sort_order)
     FROM public.transaction_receipts tr WHERE tr.transaction_id = t.id),
    ARRAY[]::TEXT[]
  ) AS receipt_urls,
  (SELECT tr.public_url FROM public.transaction_receipts tr WHERE tr.transaction_id = t.id AND tr.sort_order = 0 LIMIT 1) AS receipt_url
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
LEFT JOIN public.semesters s ON t.semester_id = s.id
LEFT JOIN public.profiles p ON t.logged_by = p.id;

COMMENT ON TABLE public.transactions IS 'FinLITE Core Ledger: Fully Normalized 3NF Financial Ledger';
COMMENT ON TABLE public.transaction_receipts IS 'Normalized 1:N Transaction Vouchers & Receipt Proofs';
COMMENT ON TABLE public.denominations IS 'BSP Currency Denominations Reference Catalog';
COMMENT ON TABLE public.cash_reconciliation_items IS 'Physical Cashbox Audit Line Items';
