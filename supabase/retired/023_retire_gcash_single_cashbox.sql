-- ==============================================================================
-- FinLITE Database Migration 023: Retire GCash Module & Transition to Single Cashbox
-- 
-- Institutional Scope Decision:
-- LITE maintains no corporate/institutional GCash or mobile money accounts.
-- All organizational funds reside exclusively inside the small metal cashbox
-- secured in the Program Director's (PD's) room. Personal advances ("abono") paid
-- digitally by officers/advisers are recorded as standard Accounts Payable liabilities
-- with digital receipts attached, reimbursed solely in physical cash.
-- ==============================================================================

-- 1. Convert any legacy GCASH payment method values to CASH before dropping column
UPDATE public.transactions 
SET payment_method = 'CASH' 
WHERE payment_method = 'GCASH';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_disbursements' AND column_name = 'payment_method') THEN
    UPDATE public.advance_disbursements SET payment_method = 'CASH' WHERE payment_method = 'GCASH';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debt_payments' AND column_name = 'payment_method') THEN
    UPDATE public.debt_payments SET payment_method = 'CASH' WHERE payment_method = 'GCASH';
  END IF;
END $$;

-- 2. Update process_financial_audit_event() Trigger Function (removes payment_method reference)
CREATE OR REPLACE FUNCTION public.process_financial_audit_event()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_entity_type TEXT;
  v_entity_id TEXT;
  v_details JSONB;
BEGIN
  v_user_id := auth.uid();
  v_entity_type := TG_TABLE_NAME;

  -- 1. Determine action name
  IF (TG_OP = 'INSERT') THEN
    IF TG_TABLE_NAME = 'transactions' THEN
      v_action := 'TRANSACTION_CREATED';
    ELSIF TG_TABLE_NAME = 'cash_reconciliations' THEN
      v_action := 'RECONCILIATION_PERFORMED';
    ELSIF TG_TABLE_NAME = 'semesters' THEN
      v_action := 'SEMESTER_INITIALIZED';
    ELSIF TG_TABLE_NAME = 'transaction_comments' THEN
      v_action := 'COMMENT_ADDED';
    ELSE
      v_action := TG_TABLE_NAME || '_CREATED';
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    IF TG_TABLE_NAME = 'transactions' THEN
      v_action := 'TRANSACTION_UPDATED';
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      v_action := 'PROFILE_UPDATED';
    ELSE
      v_action := TG_TABLE_NAME || '_UPDATED';
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    IF TG_TABLE_NAME = 'transactions' THEN
      v_action := 'TRANSACTION_DELETED';
    ELSIF TG_TABLE_NAME = 'profiles' THEN
      v_action := 'PROFILE_DELETED';
    ELSE
      v_action := TG_TABLE_NAME || '_DELETED';
    END IF;
  END IF;

  -- 2. Build structured details JSON
  IF (TG_OP = 'INSERT') THEN
    v_entity_id := NEW.id::TEXT;
    v_details := jsonb_build_object(
      'operation', 'INSERT',
      'snapshot', to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_entity_id := NEW.id::TEXT;
    
    -- Special detection for Abono Reimbursement settlement
    IF TG_TABLE_NAME = 'transactions' AND OLD.status = 'PENDING_REIMBURSEMENT' AND NEW.status = 'REIMBURSED' THEN
      v_action := 'ABONO_SETTLED';
    END IF;

    v_details := jsonb_build_object(
      'operation', 'UPDATE',
      'changed_fields', (to_jsonb(NEW) - to_jsonb(OLD)),
      'previous_status', OLD.status,
      'current_status', NEW.status,
      'amount', NEW.amount
    );
  ELSIF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.id::TEXT;
    v_details := jsonb_build_object(
      'operation', 'DELETE',
      'deleted_snapshot', to_jsonb(OLD)
    );
  END IF;

  -- 3. Insert append-only immutable audit entry
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    v_user_id,
    v_action,
    v_entity_type,
    v_entity_id,
    v_details,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 3. Recreate Normalized View without payment_method
CREATE OR REPLACE VIEW public.v_transactions_normalized AS
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

-- 4. Drop payment_method column from tables
ALTER TABLE public.transactions DROP COLUMN IF EXISTS payment_method;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'advance_disbursements' AND column_name = 'payment_method') THEN
    ALTER TABLE public.advance_disbursements DROP COLUMN payment_method;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debt_payments' AND column_name = 'payment_method') THEN
    ALTER TABLE public.debt_payments DROP COLUMN payment_method;
  END IF;
END $$;

-- 5. Drop obsolete payment_method ENUM
DROP TYPE IF EXISTS public.payment_method CASCADE;

-- 6. Remove starting_gcash_balance from semesters table
ALTER TABLE public.semesters DROP COLUMN IF EXISTS starting_gcash_balance;

-- 7. Update get_financial_summary() function to Pure Single Cashbox Model
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS JSON AS $$
DECLARE
  v_total_inflows NUMERIC(12, 2);
  v_total_outflows NUMERIC(12, 2);
  v_cash_on_hand NUMERIC(12, 2);
  v_pending_reimbursements NUMERIC(12, 2);
  v_net_position NUMERIC(12, 2);
BEGIN
  -- Compute Total Inflows (All completed inflows into cashbox)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_inflows
  FROM public.transactions 
  WHERE type = 'INFLOW';

  -- Compute Total Outflows (Disbursed from cashbox)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_outflows
  FROM public.transactions 
  WHERE type = 'OUTFLOW' AND status != 'PENDING_REIMBURSEMENT';

  -- Compute Physical Cash on Hand (Inflows minus disbursed outflows)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE -amount END), 0)
  INTO v_cash_on_hand
  FROM public.transactions
  WHERE status != 'PENDING_REIMBURSEMENT';

  -- Compute Pending Reimbursements (Active Abono liabilities owed to officers/advisers)
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_reimbursements
  FROM public.transactions
  WHERE is_reimbursement = TRUE AND status = 'PENDING_REIMBURSEMENT';

  -- Compute True Net Position: Cash on Hand minus Pending Abono
  v_net_position := v_cash_on_hand - v_pending_reimbursements;

  RETURN json_build_object(
    'total_inflows', v_total_inflows,
    'total_outflows', v_total_outflows,
    'net_balance', (v_total_inflows - v_total_outflows),
    'cash_on_hand', v_cash_on_hand,
    'pending_reimbursements', v_pending_reimbursements,
    'net_position', v_net_position
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
