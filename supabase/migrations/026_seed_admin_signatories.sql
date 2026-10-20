-- ==============================================================================
-- FinLITE Migration 026: Seed College Administration Signatories
-- Populates BSIT Program Director and CCS Dean into semester_signatories
-- ==============================================================================

INSERT INTO public.semester_signatories (academic_year, semester, role_key, name, position_title, category, sort_order, is_active)
VALUES
  -- 2025-2026 1st Sem
  ('2025-2026', '1st Sem', 'director', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT', 'Program Director, BSIT', 'ADMIN', 7, true),
  ('2025-2026', '1st Sem', 'dean', 'DR. EMRAIDA MARIE M. MANUCOM', 'Dean, College of Computer Studies', 'ADMIN', 8, true),

  -- 2025-2026 2nd Sem
  ('2025-2026', '2nd Sem', 'director', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT', 'Program Director, BSIT', 'ADMIN', 7, true),
  ('2025-2026', '2nd Sem', 'dean', 'DR. EMRAIDA MARIE M. MANUCOM', 'Dean, College of Computer Studies', 'ADMIN', 8, true),

  -- 2026-2027 1st Sem
  ('2026-2027', '1st Sem', 'director', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT', 'Program Director, BSIT', 'ADMIN', 7, true),
  ('2026-2027', '1st Sem', 'dean', 'DR. EMRAIDA MARIE M. MANUCOM', 'Dean, College of Computer Studies', 'ADMIN', 8, true),

  -- 2026-2027 2nd Sem
  ('2026-2027', '2nd Sem', 'director', 'JOVYLYN ORTIZ-CESAR, MBA, MSIT', 'Program Director, BSIT', 'ADMIN', 7, true),
  ('2026-2027', '2nd Sem', 'dean', 'DR. EMRAIDA MARIE M. MANUCOM', 'Dean, College of Computer Studies', 'ADMIN', 8, true)
ON CONFLICT (academic_year, semester, role_key) DO UPDATE
SET
  name = EXCLUDED.name,
  position_title = EXCLUDED.position_title,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
