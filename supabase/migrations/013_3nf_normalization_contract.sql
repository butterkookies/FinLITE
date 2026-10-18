-- ==============================================================================
-- FinLITE Database Migration 013: 3NF Normalization Contract Phase  [RETIRED]
--
-- This migration never applied to the live database and is intentionally a no-op.
--   * Its safe parts (dropping legacy transactions / denomination columns and the
--     NOT NULL on transactions FKs) are covered by 017_safe_3nf_column_contraction.
--   * Its remaining parts (generated profiles.full_name / semesters.label, dropping
--     shortages_abono.handled_by and cash_reconciliations.academic_year/semester)
--     conflict with the application, which still writes those columns.
--
-- Original text is preserved in supabase/retired/013_3nf_normalization_contract.sql.
-- See 025_schema_reconciliation_and_ledger_integrity.sql for the reconciliation.
-- ==============================================================================

SELECT 1;
