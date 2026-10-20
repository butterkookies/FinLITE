-- ==============================================================================
-- FinLITE Database Migration 030: Allow All Approved Officers & Members to Insert Transactions
--
-- Relaxes transactions_insert_policy so any approved officer/member (not only
-- treasurer or auditor) can record transactions directly into the ledger.
-- ==============================================================================

BEGIN;

DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;

CREATE POLICY "transactions_insert_policy"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.is_approved_member()
  );

COMMIT;
