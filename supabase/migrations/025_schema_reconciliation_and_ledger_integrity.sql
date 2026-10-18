-- ==============================================================================
-- FinLITE Database Migration 025: Schema Reconciliation & Ledger Integrity
--
-- Decisions (see DB inspection report):
--   * Migration 023 (single cashbox / GCash retirement) is ADOPTED. Its effects are
--     re-applied here idempotently because the live DB never received them.
--   * Migration 013's column contraction (generated profiles.full_name /
--     semesters.label, dropping shortages_abono.handled_by and
--     cash_reconciliations.academic_year/semester) is RETIRED. The app still
--     writes those columns, so turning them into generated columns would break
--     inserts. They remain as plain columns.
--
-- This migration:
--   1. Closes the RLS hole on debts/advances (`OR auth.uid() IS NOT NULL`).
--   2. Re-applies 023 (drops payment_method + starting_gcash_balance) safely.
--   3. Converts debts_receivables / advances_payable.semester_id TEXT -> UUID FK.
--   4. Fixes transactions.category_id FK (NOT NULL column with ON DELETE SET NULL).
--   5. Adds overpayment guards, FK indexes and updated_at triggers.
--   6. Adds atomic RPCs: record_debt_payment / record_advance_disbursement.
--
-- Safe to run on the current live DB and on a fresh replay.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. Helper: can the caller write financial records?
--    Approved treasurer / president / adviser / admin. Auditors stay read-only
--    (segregation of duties), matching the client-side check in app/page.jsx.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_manage_finances()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT COALESCE(public.current_user_role() IN ('admin', 'treasurer', 'president', 'adviser'), false);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_finances() TO authenticated;

-- ------------------------------------------------------------------------------
-- 1. RLS: debts_receivables, debt_payments, advances_payable, advance_disbursements
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow authenticated read debts_receivables" ON public.debts_receivables;
DROP POLICY IF EXISTS "Allow authenticated read debt_payments" ON public.debt_payments;
DROP POLICY IF EXISTS "Allow officers to insert debts_receivables" ON public.debts_receivables;
DROP POLICY IF EXISTS "Allow officers to update debts_receivables" ON public.debts_receivables;
DROP POLICY IF EXISTS "Allow officers to delete debts_receivables" ON public.debts_receivables;
DROP POLICY IF EXISTS "Allow officers to insert debt_payments" ON public.debt_payments;

DROP POLICY IF EXISTS "Allow authenticated read advances_payable" ON public.advances_payable;
DROP POLICY IF EXISTS "Allow authenticated read advance_disbursements" ON public.advance_disbursements;
DROP POLICY IF EXISTS "Allow officers to insert advances_payable" ON public.advances_payable;
DROP POLICY IF EXISTS "Allow officers to update advances_payable" ON public.advances_payable;
DROP POLICY IF EXISTS "Allow officers to delete advances_payable" ON public.advances_payable;
DROP POLICY IF EXISTS "Allow officers to insert advance_disbursements" ON public.advance_disbursements;

-- Read: approved members only
CREATE POLICY "debts_receivables_select_members" ON public.debts_receivables
  FOR SELECT TO authenticated USING (public.is_approved_member());
CREATE POLICY "debt_payments_select_members" ON public.debt_payments
  FOR SELECT TO authenticated USING (public.is_approved_member());
CREATE POLICY "advances_payable_select_members" ON public.advances_payable
  FOR SELECT TO authenticated USING (public.is_approved_member());
CREATE POLICY "advance_disbursements_select_members" ON public.advance_disbursements
  FOR SELECT TO authenticated USING (public.is_approved_member());

-- Parent records: officers create/edit; only admins delete (prefer CANCELLED status)
CREATE POLICY "debts_receivables_insert_officers" ON public.debts_receivables
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_finances());
CREATE POLICY "debts_receivables_update_officers" ON public.debts_receivables
  FOR UPDATE TO authenticated USING (public.can_manage_finances()) WITH CHECK (public.can_manage_finances());
CREATE POLICY "debts_receivables_delete_admin" ON public.debts_receivables
  FOR DELETE TO authenticated USING (public.is_admin());

CREATE POLICY "advances_payable_insert_officers" ON public.advances_payable
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_finances());
CREATE POLICY "advances_payable_update_officers" ON public.advances_payable
  FOR UPDATE TO authenticated USING (public.can_manage_finances()) WITH CHECK (public.can_manage_finances());
CREATE POLICY "advances_payable_delete_admin" ON public.advances_payable
  FOR DELETE TO authenticated USING (public.is_admin());

-- Child installment rows: append-only, written exclusively via the RPCs below
-- (SECURITY DEFINER). No direct INSERT/UPDATE/DELETE policies.

-- ------------------------------------------------------------------------------
-- 2. Re-apply migration 023 (single cashbox) idempotently
-- ------------------------------------------------------------------------------
--    Why 023 never landed: its `CREATE OR REPLACE VIEW v_transactions_normalized`
--    removes a column, which Postgres rejects ("cannot drop columns from view"),
--    so the whole migration rolled back. Here the view is dropped and recreated.

-- 2a. Audit trigger function: generic, never references table-specific columns.
--     Also maps auth.uid() -> profiles.id (audit_logs.user_id FKs profiles, not auth.users).
CREATE OR REPLACE FUNCTION public.process_financial_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_new JSONB := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old JSONB := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_changed JSONB;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

  v_action := CASE
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'transactions'          THEN 'TRANSACTION_CREATED'
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'cash_reconciliations'  THEN 'RECONCILIATION_PERFORMED'
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'semesters'             THEN 'SEMESTER_INITIALIZED'
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'transaction_comments'  THEN 'COMMENT_ADDED'
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'debt_payments'         THEN 'DEBT_PAYMENT_RECORDED'
    WHEN TG_OP = 'INSERT' AND TG_TABLE_NAME = 'advance_disbursements' THEN 'DISBURSE_ABONO_PAYOUT'
    WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions'
         AND v_old->>'status' = 'PENDING_REIMBURSEMENT' AND v_new->>'status' = 'REIMBURSED' THEN 'ABONO_SETTLED'
    WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'transactions'          THEN 'TRANSACTION_UPDATED'
    WHEN TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'profiles'              THEN 'PROFILE_UPDATED'
    WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME = 'transactions'          THEN 'TRANSACTION_DELETED'
    WHEN TG_OP = 'DELETE' AND TG_TABLE_NAME = 'profiles'              THEN 'PROFILE_DELETED'
    ELSE TG_TABLE_NAME || CASE TG_OP WHEN 'INSERT' THEN '_CREATED' WHEN 'UPDATE' THEN '_UPDATED' ELSE '_DELETED' END
  END;

  IF TG_OP = 'UPDATE' THEN
    SELECT COALESCE(jsonb_object_agg(n.key, n.value), '{}'::jsonb) INTO v_changed
    FROM jsonb_each(v_new) n
    WHERE n.value IS DISTINCT FROM v_old->n.key
      AND n.key NOT IN ('updated_at');
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;  -- no-op update (e.g. only updated_at touched)
    END IF;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(v_new->>'id', v_old->>'id'),
    CASE TG_OP
      WHEN 'INSERT' THEN jsonb_build_object('operation', 'INSERT', 'snapshot', v_new)
      WHEN 'UPDATE' THEN jsonb_build_object(
        'operation', 'UPDATE',
        'changed_fields', v_changed,
        'previous', (SELECT jsonb_object_agg(k, v_old->k) FROM jsonb_object_keys(v_changed) k))
      ELSE jsonb_build_object('operation', 'DELETE', 'deleted_snapshot', v_old)
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 2b. Convert legacy GCASH rows, then drop the view so the column can go.
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions', 'debt_payments', 'advance_disbursements'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t AND column_name = 'payment_method') THEN
      EXECUTE format('UPDATE public.%I SET payment_method = ''CASH'' WHERE payment_method::text = ''GCASH''', t);
    END IF;
  END LOOP;
END $$;

DROP VIEW IF EXISTS public.v_transactions_normalized;

ALTER TABLE public.transactions          DROP COLUMN IF EXISTS payment_method;
ALTER TABLE public.debt_payments         DROP COLUMN IF EXISTS payment_method;
ALTER TABLE public.advance_disbursements DROP COLUMN IF EXISTS payment_method;
ALTER TABLE public.semesters             DROP COLUMN IF EXISTS starting_gcash_balance;
DROP TYPE IF EXISTS public.payment_method;

-- 2c. Recreate the normalized view (023 shape) with security_invoker (019).
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

-- 2d. Single-cashbox financial summary (023 version, no GCash).
CREATE OR REPLACE FUNCTION public.get_financial_summary()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_inflows NUMERIC(12, 2);
  v_total_outflows NUMERIC(12, 2);
  v_cash_on_hand NUMERIC(12, 2);
  v_pending_reimbursements NUMERIC(12, 2);
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'INFLOW'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'OUTFLOW' AND status != 'PENDING_REIMBURSEMENT'), 0),
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE -amount END)
             FILTER (WHERE status != 'PENDING_REIMBURSEMENT'), 0),
    COALESCE(SUM(amount) FILTER (WHERE is_reimbursement AND status = 'PENDING_REIMBURSEMENT'), 0)
  INTO v_total_inflows, v_total_outflows, v_cash_on_hand, v_pending_reimbursements
  FROM public.transactions;

  RETURN json_build_object(
    'total_inflows', v_total_inflows,
    'total_outflows', v_total_outflows,
    'net_balance', v_total_inflows - v_total_outflows,
    'cash_on_hand', v_cash_on_hand,
    'pending_reimbursements', v_pending_reimbursements,
    'net_position', v_cash_on_hand - v_pending_reimbursements
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. semester_id TEXT -> UUID FK on debts_receivables / advances_payable
--    Mapping: valid UUID string -> kept if it exists in semesters
--             'sem-YY-YY-N' slug  -> matched by academic year + semester ordinal
--             anything else       -> active semester (or most recent)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.resolve_semester_id(p_raw TEXT)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
  v_parts TEXT[];
BEGIN
  IF p_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_id FROM public.semesters WHERE id = p_raw::uuid;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  -- e.g. 'sem-26-27-1' -> AY '2026-2027', semester starting with '1'
  v_parts := regexp_match(p_raw, '^sem-(\d{2})-(\d{2})-(\d)');
  IF v_parts IS NOT NULL THEN
    SELECT id INTO v_id FROM public.semesters
    WHERE academic_year = '20' || v_parts[1] || '-20' || v_parts[2]
      AND semester ILIKE v_parts[3] || '%'
    LIMIT 1;
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  END IF;

  SELECT id INTO v_id FROM public.semesters
  ORDER BY is_active DESC, created_at DESC
  LIMIT 1;
  RETURN v_id;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['debts_receivables', 'advances_payable'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = t
                 AND column_name = 'semester_id' AND data_type = 'text') THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN semester_id DROP DEFAULT', t);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN semester_uuid UUID', t);
      EXECUTE format('UPDATE public.%I SET semester_uuid = pg_temp.resolve_semester_id(semester_id)', t);
      EXECUTE format('DROP INDEX IF EXISTS public.idx_%s_sem_status', t);
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN semester_id', t);
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN semester_uuid TO semester_id', t);
      -- Rows can only stay NULL if the semesters table is empty.
      IF NOT EXISTS (SELECT 1 FROM public.semesters) THEN
        RAISE NOTICE '%: semesters table is empty; semester_id left nullable', t;
      ELSE
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN semester_id SET NOT NULL', t);
      END IF;
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (semester_id) REFERENCES public.semesters(id) ON DELETE RESTRICT',
        t, t || '_semester_id_fkey');
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_sem_status ON public.%I (semester_id, status)', t, t);
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 4. transactions.category_id is NOT NULL -> FK must be RESTRICT, not SET NULL
-- ------------------------------------------------------------------------------
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

-- ------------------------------------------------------------------------------
-- 5. Integrity guards, indexes, timestamps
-- ------------------------------------------------------------------------------
ALTER TABLE public.debts_receivables DROP CONSTRAINT IF EXISTS chk_debt_not_overpaid;
ALTER TABLE public.debts_receivables
  ADD CONSTRAINT chk_debt_not_overpaid CHECK (amount_paid <= total_amount) NOT VALID;

ALTER TABLE public.advances_payable DROP CONSTRAINT IF EXISTS chk_advance_not_overreimbursed;
ALTER TABLE public.advances_payable
  ADD CONSTRAINT chk_advance_not_overreimbursed CHECK (amount_reimbursed <= total_amount) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_transactions_sem_date      ON public.transactions (semester_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category      ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_logged_by     ON public.transactions (logged_by);
CREATE INDEX IF NOT EXISTS idx_cash_recon_semester        ON public.cash_reconciliations (semester_id);
CREATE INDEX IF NOT EXISTS idx_shortages_abono_recon      ON public.shortages_abono (reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_by       ON public.profiles (approved_by);

-- transaction_comments: timezone('utc', now()) yields a naive timestamp that is
-- reinterpreted in the session TZ. now() is the correct timestamptz default.
ALTER TABLE public.transaction_comments ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.transaction_comments ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['transactions', 'profiles', 'debts_receivables', 'advances_payable', 'transaction_comments'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_touch_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_touch_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()',
      t, t);
  END LOOP;
END $$;

-- Server-side audit for the payables/receivables subsystem
-- (reuses process_financial_audit_event() from migrations 016/023)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['debts_receivables', 'advances_payable', 'debt_payments', 'advance_disbursements', 'shortages_abono'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%s ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%s AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.process_financial_audit_event()',
      t, t);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 6. Atomic RPCs
--    Each call: locks the parent row, validates the amount against the remaining
--    balance, writes the ledger transaction + installment row (linked through
--    transaction_id) and recomputes the parent balance from SUM() in one
--    database transaction.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_debt_payment(
  p_debt_id UUID,
  p_amount NUMERIC,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.debts_receivables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_debt public.debts_receivables;
  v_profile_id UUID;
  v_category_id UUID;
  v_semester_id UUID;
  v_tx_id UUID;
  v_paid NUMERIC(12,2);
BEGIN
  IF NOT public.can_manage_finances() THEN
    RAISE EXCEPTION 'Not authorized to record payments' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_debt FROM public.debts_receivables WHERE id = p_debt_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Debt % not found', p_debt_id USING ERRCODE = 'P0002';
  END IF;
  IF v_debt.status::text IN ('SETTLED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Debt is already %', v_debt.status USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0' USING ERRCODE = '22023';
  END IF;
  IF p_amount > v_debt.total_amount - v_debt.amount_paid THEN
    RAISE EXCEPTION 'Amount exceeds remaining balance of %', v_debt.total_amount - v_debt.amount_paid
      USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

  SELECT id INTO v_category_id FROM public.categories
  WHERE type = 'INFLOW'
  ORDER BY (lower(name) = 'other verified inflow') DESC, created_at
  LIMIT 1;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'No INFLOW category configured' USING ERRCODE = 'P0002';
  END IF;

  v_semester_id := COALESCE(
    v_debt.semester_id,
    (SELECT id FROM public.semesters ORDER BY is_active DESC, created_at DESC LIMIT 1)
  );

  INSERT INTO public.transactions (
    title, description, amount, type, category_id, semester_id, logged_by,
    transaction_date, status
  ) VALUES (
    format('Debt Settlement: %s (%s)', v_debt.title, v_debt.debtor_name),
    COALESCE(NULLIF(p_notes, ''), format('Installment collection of ₱%s from %s', to_char(p_amount, 'FM999,999,990.00'), v_debt.debtor_name)),
    p_amount, 'INFLOW', v_category_id, v_semester_id, v_profile_id,
    CURRENT_DATE, 'COMPLETED'
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.debt_payments (debt_id, transaction_id, amount, received_by, notes)
  VALUES (p_debt_id, v_tx_id, p_amount, v_profile_id, NULLIF(p_notes, ''));

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.debt_payments WHERE debt_id = p_debt_id;

  UPDATE public.debts_receivables
  SET amount_paid = v_paid,
      status = (CASE WHEN v_paid >= total_amount THEN 'SETTLED' ELSE 'PARTIALLY_PAID' END)::debt_status
  WHERE id = p_debt_id
  RETURNING * INTO v_debt;

  RETURN v_debt;
END;
$$;

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

  SELECT id INTO v_profile_id FROM public.profiles WHERE auth_user_id = auth.uid() LIMIT 1;

  -- Prefer the advance's own category, then a name match, then any OUTFLOW category
  SELECT id INTO v_category_id FROM public.categories
  WHERE type = 'OUTFLOW'
  ORDER BY (id = v_adv.category_id) DESC,
           (lower(name) = lower(COALESCE(v_adv.category_name, ''))) DESC,
           created_at
  LIMIT 1;
  IF v_category_id IS NULL THEN
    RAISE EXCEPTION 'No OUTFLOW category configured' USING ERRCODE = 'P0002';
  END IF;

  v_semester_id := COALESCE(
    v_adv.semester_id,
    (SELECT id FROM public.semesters ORDER BY is_active DESC, created_at DESC LIMIT 1)
  );

  INSERT INTO public.transactions (
    title, description, amount, type, category_id, semester_id, logged_by,
    transaction_date, status, event_name
  ) VALUES (
    format('Abono Reimbursement: %s (%s)', v_adv.title, v_adv.claimant_name),
    COALESCE(NULLIF(p_notes, ''), format('Reimbursement payout of ₱%s to %s', to_char(p_amount, 'FM999,999,990.00'), v_adv.claimant_name)),
    p_amount, 'OUTFLOW', v_category_id, v_semester_id, v_profile_id,
    CURRENT_DATE, 'COMPLETED', v_adv.event_name
  )
  RETURNING id INTO v_tx_id;

  INSERT INTO public.advance_disbursements (advance_id, transaction_id, amount, disbursed_by, notes)
  VALUES (p_advance_id, v_tx_id, p_amount, v_profile_id, NULLIF(p_notes, ''));

  SELECT COALESCE(SUM(amount), 0) INTO v_reimbursed FROM public.advance_disbursements WHERE advance_id = p_advance_id;

  UPDATE public.advances_payable
  SET amount_reimbursed = v_reimbursed,
      status = (CASE WHEN v_reimbursed >= total_amount THEN 'SETTLED' ELSE 'PARTIALLY_REIMBURSED' END)::advance_status
  WHERE id = p_advance_id
  RETURNING * INTO v_adv;

  RETURN v_adv;
END;
$$;

REVOKE ALL ON FUNCTION public.record_debt_payment(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_advance_disbursement(UUID, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_debt_payment(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_advance_disbursement(UUID, NUMERIC, TEXT) TO authenticated;

COMMIT;
