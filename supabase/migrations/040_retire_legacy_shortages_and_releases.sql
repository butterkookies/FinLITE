-- ==============================================================================
-- Migration 040: Retire Legacy shortages_abono and Unused app_releases
-- ==============================================================================
-- 1. shortages_abono is obsolete Sprint 1 code completely superseded by:
--    - cash_reconciliations (variance_amount, approval_status, adviser_decision_by)
--    - advances_payable and advance_disbursements (3NF Abono subsystem)
-- 2. app_releases is retired to streamline the production schema
-- ==============================================================================

DROP TABLE IF EXISTS public.shortages_abono CASCADE;
DROP TABLE IF EXISTS public.app_releases CASCADE;
