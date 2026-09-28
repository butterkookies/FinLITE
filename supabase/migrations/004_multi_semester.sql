-- ==============================================================================
-- FinLITE Database Migration 004: Multi-Semester Management & Carry-Over Balances
-- Enables multi-term academic archiving and beginning balance rollover
-- ==============================================================================

-- 1. Add academic_year and semester columns to transactions if not yet present
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026',
ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT '2nd Sem';

-- 2. Create Semesters Metadata Table
CREATE TABLE IF NOT EXISTS semesters (
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

-- 3. Insert Default Starting Semesters
INSERT INTO semesters (academic_year, semester, label, is_active) VALUES
  ('2025-2026', '2nd Sem', 'AY 2025–2026 • 2nd Sem', TRUE),
  ('2026-2027', '1st Sem', 'AY 2026–2027 • 1st Sem', FALSE)
ON CONFLICT (academic_year, semester) DO NOTHING;
