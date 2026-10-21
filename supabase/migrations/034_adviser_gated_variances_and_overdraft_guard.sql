-- ==============================================================================
-- FinLITE Database Migration 034: Adviser-Gated Cash Variances & Database Overdraft Guard
-- 1. Introduces variance approval status and adviser audit decision columns.
-- 2. Stored procedure get_available_cash_on_hand() for server-side solvency checks.
-- 3. Overdraft-guarded record_advance_disbursement() RPC preventing negative cash.
-- ==============================================================================

-- 1. Create variance_approval_status enum
DO $$ BEGIN
  CREATE TYPE variance_approval_status AS ENUM ('BALANCED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

BEGIN;

-- 2. Add approval fields to cash_reconciliations
ALTER TABLE public.cash_reconciliations
  ADD COLUMN IF NOT EXISTS approval_status variance_approval_status NOT NULL DEFAULT 'BALANCED',
  ADD COLUMN IF NOT EXISTS adviser_decision_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS adviser_decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS adviser_notes TEXT;

-- 3. Stored Procedure: Get Available Cash on Hand for a Semester
CREATE OR REPLACE FUNCTION public.get_available_cash_on_hand(p_semester_id UUID)
RETURNS NUMERIC(12, 2)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_inflows NUMERIC(12, 2) := 0;
  v_outflows NUMERIC(12, 2) := 0;
BEGIN
  -- Sum verified inflows (COMPLETED)
  SELECT COALESCE(SUM(amount), 0) INTO v_inflows
  FROM public.transactions
  WHERE semester_id = p_semester_id
    AND type = 'INFLOW'
    AND status = 'COMPLETED';

  -- Sum verified outflows (COMPLETED)
  SELECT COALESCE(SUM(amount), 0) INTO v_outflows
  FROM public.transactions
  WHERE semester_id = p_semester_id
    AND type = 'OUTFLOW'
    AND status = 'COMPLETED';

  RETURN v_inflows - v_outflows;
END;
$$;

-- 4. Overdraft Guard Function for Stored Disbursements
CREATE OR REPLACE FUNCTION public.record_advance_disbursement(
  p_advance_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.advances_payable
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_adv public.advances_payable;
  v_profile_id UUID;
  v_category_id UUID;
  v_semester_id UUID;
  v_tx_id UUID;
  v_reimbursed NUMERIC(12,2);
  v_available_cash NUMERIC(12,2);
BEGIN
  IF NOT public.can_manage_finances() THEN
    RAISE EXCEPTION 'Not authorized to disburse reimbursements' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_adv FROM public.advances_payable WHERE id = p_advance_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Advance % not found', p_advance_id USING ERRCODE = 'P0002';
  END IF;
  IF v_adv.status::text IN ('SETTLED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Advance is already %', v_adv.status USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0' USING ERRCODE = '22023';
  END IF;
  IF p_amount > v_adv.total_amount - v_adv.amount_reimbursed THEN
    RAISE EXCEPTION 'Amount exceeds remaining balance of %', v_adv.total_amount - v_adv.amount_reimbursed
      USING ERRCODE = '22023';
  END IF;

  -- Resolve Active Semester for Cash Outflow
  SELECT id INTO v_semester_id FROM public.semesters WHERE is_active = true LIMIT 1;
  IF v_semester_id IS NULL THEN
    v_semester_id := v_adv.semester_id;
  END IF;

  -- OVERDRAFT GUARD: Check physical cashbox solvency
  v_available_cash := public.get_available_cash_on_hand(v_semester_id);
  IF p_amount > v_available_cash THEN
    RAISE EXCEPTION 'Insufficient physical cashbox balance (Available: ₱%, Requested: ₱%)',
      to_char(v_available_cash, 'FM999,999,990.00'),
      to_char(p_amount, 'FM999,999,990.00')
      USING ERRCODE = '23514';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

  SELECT id INTO v_category_id FROM public.categories
  WHERE type = 'OUTFLOW'
  ORDER BY (id = v_adv.category_id) DESC,
           (lower(name) = lower(COALESCE(v_adv.category_name, ''))) DESC,
           created_at
  LIMIT 1;

  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'No OUTFLOW category configured' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.transactions (
    title, description, amount, type, category_id, semester_id, logged_by,
    transaction_date, status, event_name, is_reimbursement,
    reimbursement_recipient, advanced_by_name
  ) VALUES (
    format('Abono Reimbursement: %s (%s)', v_adv.title, v_adv.claimant_name),
    COALESCE(NULLIF(p_notes, ''), format('Reimbursement payout of ₱%s to %s', to_char(p_amount, 'FM999,999,990.00'), v_adv.claimant_name)),
    p_amount, 'OUTFLOW', v_category_id, v_semester_id, v_profile_id,
    CURRENT_DATE, 'COMPLETED', v_adv.event_name, true,
    v_adv.claimant_name, COALESCE(v_adv.advanced_by_name, v_adv.claimant_name)
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.advance_disbursements (advance_id, transaction_id, amount, disbursed_by, notes)
  VALUES (p_advance_id, v_tx_id, p_amount, v_profile_id, NULLIF(p_notes, ''));

  SELECT COALESCE(SUM(amount), 0) INTO v_reimbursed FROM public.advance_disbursements WHERE advance_id = p_advance_id;

  UPDATE public.advances_payable
  SET amount_reimbursed = v_reimbursed,
      status = (CASE WHEN v_reimbursed >= total_amount THEN 'SETTLED' ELSE 'PARTIALLY_REIMBURSED' END)::advance_status,
      updated_at = NOW()
  WHERE id = p_advance_id
  RETURNING * INTO v_adv;

  RETURN v_adv;
END;
$$;

REVOKE ALL ON FUNCTION public.get_available_cash_on_hand(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_available_cash_on_hand(UUID) TO authenticated;

COMMIT;
