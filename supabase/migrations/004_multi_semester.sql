-- ==============================================================================
-- FinLITE Database Migration 004: Multi-Semester Management & Carry-Over Balances
-- Enables multi-term academic archiving and beginning balance rollover
-- ==============================================================================

-- 1. Add academic_year and semester columns to transactions if not yet present
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026',
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT '2nd Sem';

-- Update legacy rows to ensure consistency
UPDATE public.transactions 
SET academic_year = '2025-2026', semester = '2nd Sem' 
WHERE academic_year IS NULL OR semester IS NULL;

-- Remove security pen-test dummy record if still present
DELETE FROM public.transactions WHERE title = 'HACKED TRANSACTION TEST';

-- 2. Create Semesters Metadata Table
CREATE TABLE IF NOT EXISTS public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,          -- e.g. '2025-2026', '2026-2027'
  semester TEXT NOT NULL,               -- e.g. '1st Sem', '2nd Sem'
  label TEXT NOT NULL,                  -- e.g. 'AY 2025–2026 • 2nd Sem'
  starting_cash_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  starting_gcash_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(academic_year, semester)
);

-- 3. Row-Level Security for Semesters Table
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "semesters_select_policy" ON public.semesters;
CREATE POLICY "semesters_select_policy"
  ON public.semesters FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "semesters_insert_policy" ON public.semesters;
CREATE POLICY "semesters_insert_policy"
  ON public.semesters FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "semesters_update_policy" ON public.semesters;
CREATE POLICY "semesters_update_policy"
  ON public.semesters FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- 4. Insert Default Starting Semesters
INSERT INTO public.semesters (academic_year, semester, label, is_active) VALUES
  ('2025-2026', '2nd Sem', 'AY 2025–2026 • 2nd Sem', FALSE),
  ('2026-2027', '1st Sem', 'AY 2026–2027 • 1st Sem', TRUE)
ON CONFLICT (academic_year, semester) DO UPDATE 
SET is_active = EXCLUDED.is_active;
