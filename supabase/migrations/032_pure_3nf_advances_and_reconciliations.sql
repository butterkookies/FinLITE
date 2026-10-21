-- ==============================================================================
-- FinLITE Database Migration 032: Pure 3NF Normalization for Advances & Reconciliations
-- Eliminates remaining 1NF multi-value arrays and 3NF transitive dependencies
-- Compliant with PDM CCS Institutional Audit & Third Normal Form (3NF) Standards
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Step A: Purge 3NF Transitive Columns from cash_reconciliations
-- ------------------------------------------------------------------------------
-- Ensure every cash reconciliation session references a valid semester
UPDATE public.cash_reconciliations cr
SET semester_id = s.id
FROM public.semesters s
WHERE cr.semester_id IS NULL AND s.is_active = true;

-- Drop legacy transitive columns (determined by semester_id)
ALTER TABLE public.cash_reconciliations
  DROP COLUMN IF EXISTS academic_year,
  DROP COLUMN IF EXISTS semester;

-- ------------------------------------------------------------------------------
-- 2. Step B: Normalize advances_payable into Pure 3NF
-- ------------------------------------------------------------------------------
-- Create 1:N child table for advance receipt proofs (eliminates 1NF array)
CREATE TABLE IF NOT EXISTS public.advance_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES public.advances_payable(id) ON DELETE CASCADE,
  public_url TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on advance_receipts
ALTER TABLE public.advance_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advance_receipts_select_policy" ON public.advance_receipts;
CREATE POLICY "advance_receipts_select_policy"
  ON public.advance_receipts FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "advance_receipts_manage_policy" ON public.advance_receipts;
CREATE POLICY "advance_receipts_manage_policy"
  ON public.advance_receipts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Drop redundant transitive category name and multi-value receipt arrays
ALTER TABLE public.advances_payable
  DROP COLUMN IF EXISTS category_name,
  DROP COLUMN IF EXISTS receipt_url,
  DROP COLUMN IF EXISTS receipt_urls;
