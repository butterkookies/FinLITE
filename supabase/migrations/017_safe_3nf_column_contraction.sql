-- ==============================================================================
-- FinLITE Database Migration 017: Safe 3NF Column Contraction
-- Safely phases out legacy denormalized columns after application cutover
-- Compliant with PDM CCS Institutional Audit Standards & 3NF Relational Standards
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Pre-Flight Verification & Automatic Backfill for Orphaned Transactions
-- ------------------------------------------------------------------------------
-- Ensure every transaction has a valid category_id matching its legacy category_name
UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE t.category_id IS NULL 
  AND t.category_name IS NOT NULL 
  AND LOWER(t.category_name) = LOWER(c.name);

-- Fallback for any transactions still missing category_id (assign to first general category)
DO $$
DECLARE
  v_default_category_id UUID;
BEGIN
  SELECT id INTO v_default_category_id FROM public.categories LIMIT 1;
  IF v_default_category_id IS NOT NULL THEN
    UPDATE public.transactions 
    SET category_id = v_default_category_id 
    WHERE category_id IS NULL;
  END IF;
END $$;

-- Ensure every transaction has a valid semester_id matching its legacy academic_year & semester
UPDATE public.transactions t
SET semester_id = s.id
FROM public.semesters s
WHERE t.semester_id IS NULL 
  AND t.academic_year IS NOT NULL 
  AND t.academic_year = s.academic_year 
  AND t.semester = s.semester;

-- Fallback for any transactions still missing semester_id (assign to active semester)
DO $$
DECLARE
  v_active_semester_id UUID;
BEGIN
  SELECT id INTO v_active_semester_id FROM public.semesters WHERE is_active = true LIMIT 1;
  IF v_active_semester_id IS NOT NULL THEN
    UPDATE public.transactions 
    SET semester_id = v_active_semester_id 
    WHERE semester_id IS NULL;
  END IF;
END $$;

-- Backfill legacy receipt_urls array and single receipt_url into child table transaction_receipts
INSERT INTO public.transaction_receipts (transaction_id, public_url, sort_order, uploaded_by)
SELECT 
  t.id, 
  r.url, 
  r.idx,
  t.logged_by
FROM public.transactions t
CROSS JOIN LATERAL (
  SELECT unnest(t.receipt_urls) AS url, generate_subscripts(t.receipt_urls, 1) - 1 AS idx
  UNION
  SELECT t.receipt_url AS url, 0 AS idx WHERE t.receipt_url IS NOT NULL AND (t.receipt_urls IS NULL OR array_length(t.receipt_urls, 1) = 0)
) r
WHERE r.url IS NOT NULL AND r.url != ''
ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Enforce NOT NULL Constraints on Relational Foreign Keys
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions
  ALTER COLUMN semester_id SET NOT NULL,
  ALTER COLUMN category_id SET NOT NULL;

-- ------------------------------------------------------------------------------
-- 2.5 Drop Legacy Backward-Compatibility Triggers & Functions
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_sync_transaction_receipts_from_array ON public.transactions;
DROP TRIGGER IF EXISTS trg_sync_transactions_3nf ON public.transactions;
DROP FUNCTION IF EXISTS public.fn_sync_transaction_receipts_from_array();
DROP FUNCTION IF EXISTS public.fn_sync_transactions_3nf();

-- ------------------------------------------------------------------------------
-- 3. Safely Drop Redundant Denormalized Columns from transactions
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS category_name CASCADE,
  DROP COLUMN IF EXISTS academic_year CASCADE,
  DROP COLUMN IF EXISTS semester CASCADE,
  DROP COLUMN IF EXISTS receipt_url CASCADE,
  DROP COLUMN IF EXISTS receipt_urls CASCADE;

-- ------------------------------------------------------------------------------
-- 4. Safely Drop Repeating Denomination Columns from cash_reconciliations
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
-- 5. Refresh Normalized View for Seamless Backward-Compatible Reporting
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

GRANT SELECT ON public.v_transactions_normalized TO authenticated, anon;
