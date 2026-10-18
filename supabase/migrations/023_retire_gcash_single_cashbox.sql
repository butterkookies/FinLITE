-- ==============================================================================
-- FinLITE Database Migration 023: Retire GCash Module & Transition to Single Cashbox
--
-- Institutional Scope Decision:
-- LITE maintains no corporate/institutional GCash or mobile money accounts.
-- All organizational funds reside exclusively inside the small metal cashbox
-- secured in the Program Director's (PD's) room. Personal advances ("abono") paid
-- digitally by officers/advisers are recorded as standard Accounts Payable liabilities
-- with digital receipts attached, reimbursed solely in physical cash.
--
-- [SUPERSEDED] As written, this migration failed on the live database
-- (CREATE OR REPLACE VIEW cannot drop a column), so the whole thing rolled back.
-- It is now a no-op; the decision is implemented idempotently in
-- 025_schema_reconciliation_and_ledger_integrity.sql.
-- Original text is preserved in supabase/retired/023_retire_gcash_single_cashbox.sql.
-- ==============================================================================

SELECT 1;
