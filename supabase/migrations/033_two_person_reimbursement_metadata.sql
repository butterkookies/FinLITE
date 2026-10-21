-- ==============================================================================
-- FinLITE Database Migration 033: Two-Person Reimbursement & Personal Advance Metadata
-- Decouples the Original Creditor/Payer (advanced_by_name) from the Authorized
-- Claimant/Proxy (reimbursement_recipient / claimant_name).
-- ==============================================================================

BEGIN;

-- 1. Add advanced_by_name column to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS advanced_by_name TEXT;

-- 2. Add advanced_by_name column to advances_payable
ALTER TABLE public.advances_payable
  ADD COLUMN IF NOT EXISTS advanced_by_name TEXT;

-- 3. Backfill legacy records to maintain self-consistent parity
UPDATE public.transactions
SET advanced_by_name = reimbursement_recipient
WHERE is_reimbursement = true AND advanced_by_name IS NULL AND reimbursement_recipient IS NOT NULL;

UPDATE public.advances_payable
SET advanced_by_name = claimant_name
WHERE advanced_by_name IS NULL AND claimant_name IS NOT NULL;

-- 4. Recreate normalized view with security_invoker = true
DROP VIEW IF EXISTS public.v_transactions_normalized;

CREATE VIEW public.v_transactions_normalized
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.title,
  t.description,
  t.amount,
  t.type,
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
  t.advanced_by_name,
  t.status,
  t.event_name,
  t.created_at,
  t.updated_at,
  COALESCE(
    (SELECT array_agg(tr.public_url ORDER BY tr.sort_order)
     FROM public.transaction_receipts tr WHERE tr.transaction_id = t.id),
    ARRAY[]::TEXT[]
  ) AS receipt_urls,
  (SELECT tr.public_url FROM public.transaction_receipts tr
   WHERE tr.transaction_id = t.id AND tr.sort_order = 0 LIMIT 1) AS receipt_url
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
LEFT JOIN public.semesters s ON t.semester_id = s.id
LEFT JOIN public.profiles p ON t.logged_by = p.id;

REVOKE ALL ON public.v_transactions_normalized FROM anon;
GRANT SELECT ON public.v_transactions_normalized TO authenticated;

COMMIT;
