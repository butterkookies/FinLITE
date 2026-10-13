-- ==============================================================================
-- FinLITE Migration 014: Semester Signatories & Dynamic Officer Management
-- Supports configurable signatories per Academic Year and Semester with RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.semester_signatories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,                  -- e.g. '2025-2026', '2026-2027'
  semester TEXT NOT NULL,                       -- e.g. '1st Sem', '2nd Sem'
  role_key TEXT NOT NULL,                       -- e.g. 'president', 'treasurer', 'auditor', 'adviser1', 'adviser2', 'director', 'dean'
  name TEXT NOT NULL,                           -- Official full name with credentials
  position_title TEXT NOT NULL,                 -- Official institutional designation
  category TEXT NOT NULL DEFAULT 'OFFICER' CHECK (category IN ('OFFICER', 'ADVISER', 'ADMIN')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(academic_year, semester, role_key)
);

-- Ensure check constraint on category for existing tables
DO $$ BEGIN
  ALTER TABLE public.semester_signatories 
    ADD CONSTRAINT semester_signatories_category_check 
    CHECK (category IN ('OFFICER', 'ADVISER', 'ADMIN'));
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Index for speedy queries by academic year and semester
CREATE INDEX IF NOT EXISTS idx_semester_signatories_term 
ON public.semester_signatories(academic_year, semester, sort_order);

-- Enable Row Level Security
ALTER TABLE public.semester_signatories ENABLE ROW LEVEL SECURITY;

-- 1. Read policy: Authenticated users can view signatories (and anon if read-only preview needed)
DROP POLICY IF EXISTS "semester_signatories_select_policy" ON public.semester_signatories;
CREATE POLICY "semester_signatories_select_policy"
  ON public.semester_signatories FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Insert policy: Treasurer, Auditor, and Admin only
DROP POLICY IF EXISTS "semester_signatories_insert_policy" ON public.semester_signatories;
CREATE POLICY "semester_signatories_insert_policy"
  ON public.semester_signatories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- 3. Update policy: Treasurer, Auditor, and Admin only
DROP POLICY IF EXISTS "semester_signatories_update_policy" ON public.semester_signatories;
CREATE POLICY "semester_signatories_update_policy"
  ON public.semester_signatories FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- 4. Delete policy: Admin, Treasurer, Auditor
DROP POLICY IF EXISTS "semester_signatories_delete_policy" ON public.semester_signatories;
CREATE POLICY "semester_signatories_delete_policy"
  ON public.semester_signatories FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- Baseline Seed Data for 2025-2026 and 2026-2027 semesters
INSERT INTO public.semester_signatories (academic_year, semester, role_key, name, position_title, category, sort_order, is_active)
VALUES
  -- 2025-2026 1st Sem
  ('2025-2026', '1st Sem', 'president', 'MALBAROSA, EMANUEL', 'LITE President', 'OFFICER', 1, true),
  ('2025-2026', '1st Sem', 'treasurer', 'GERONIMO, ANDREI JOHN P.', 'LITE Treasurer', 'OFFICER', 2, true),
  ('2025-2026', '1st Sem', 'auditor', 'CABANAG, ROSE MARIELLE P.', 'LITE Auditor', 'OFFICER', 3, true),
  ('2025-2026', '1st Sem', 'adviser1', 'MS. KIMBERLY DAWN JATULAN', 'LITE Club Adviser', 'ADVISER', 4, true),
  ('2025-2026', '1st Sem', 'adviser2', 'MR. FLORANTE PANGILINAN', 'LITE Club Adviser', 'ADVISER', 5, true),

  -- 2025-2026 2nd Sem
  ('2025-2026', '2nd Sem', 'president', 'MALBAROSA, EMANUEL', 'LITE President', 'OFFICER', 1, true),
  ('2025-2026', '2nd Sem', 'treasurer', 'GERONIMO, ANDREI JOHN P.', 'LITE Treasurer', 'OFFICER', 2, true),
  ('2025-2026', '2nd Sem', 'auditor', 'CABANAG, ROSE MARIELLE P.', 'LITE Auditor', 'OFFICER', 3, true),
  ('2025-2026', '2nd Sem', 'adviser1', 'MS. KIMBERLY DAWN JATULAN', 'LITE Club Adviser', 'ADVISER', 4, true),
  ('2025-2026', '2nd Sem', 'adviser2', 'MR. FLORANTE PANGILINAN', 'LITE Club Adviser', 'ADVISER', 5, true),

  -- 2026-2027 1st Sem
  ('2026-2027', '1st Sem', 'president', 'GERONIMO, ANDREI JOHN P.', 'LITE President', 'OFFICER', 1, true),
  ('2026-2027', '1st Sem', 'vice_president', 'BAJAMUNDE, JHELLIAM T.', 'LITE Vice President', 'OFFICER', 2, true),
  ('2026-2027', '1st Sem', 'treasurer', 'CABANAG, ROSE MARIELLE P.', 'LITE Treasurer', 'OFFICER', 3, true),
  ('2026-2027', '1st Sem', 'auditor', 'SARA, RISHAME P.', 'LITE Auditor', 'OFFICER', 4, true),
  ('2026-2027', '1st Sem', 'adviser1', 'MS. KIMBERLY DAWN JATULAN', 'LITE Club Adviser', 'ADVISER', 5, true),
  ('2026-2027', '1st Sem', 'adviser2', 'MS. KRIZIA MAE GENOVIA', 'LITE Club Adviser', 'ADVISER', 6, true),

  -- 2026-2027 2nd Sem
  ('2026-2027', '2nd Sem', 'president', 'GERONIMO, ANDREI JOHN P.', 'LITE President', 'OFFICER', 1, true),
  ('2026-2027', '2nd Sem', 'vice_president', 'BAJAMUNDE, JHELLIAM T.', 'LITE Vice President', 'OFFICER', 2, true),
  ('2026-2027', '2nd Sem', 'treasurer', 'CABANAG, ROSE MARIELLE P.', 'LITE Treasurer', 'OFFICER', 3, true),
  ('2026-2027', '2nd Sem', 'auditor', 'SARA, RISHAME P.', 'LITE Auditor', 'OFFICER', 4, true),
  ('2026-2027', '2nd Sem', 'adviser1', 'MS. KIMBERLY DAWN JATULAN', 'LITE Club Adviser', 'ADVISER', 5, true),
  ('2026-2027', '2nd Sem', 'adviser2', 'MS. KRIZIA MAE GENOVIA', 'LITE Club Adviser', 'ADVISER', 6, true)
ON CONFLICT (academic_year, semester, role_key) DO UPDATE
SET 
  name = EXCLUDED.name,
  position_title = EXCLUDED.position_title,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_semester_signatories_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_semester_signatories_updated_at ON public.semester_signatories;
CREATE TRIGGER trg_semester_signatories_updated_at
  BEFORE UPDATE ON public.semester_signatories
  FOR EACH ROW EXECUTE FUNCTION update_semester_signatories_timestamp();

