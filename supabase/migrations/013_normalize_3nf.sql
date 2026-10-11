-- ==============================================================================
-- FinLITE Database Migration 013: Normalization to Third Normal Form (3NF)
-- Resolves:
--  1. 1NF Violation: Non-atomic receipt_urls TEXT[] -> transaction_receipts table
--  2. 3NF Transitive Dependency: category_name in transactions -> categories(id)
--  3. 2NF/3NF Composite Redundancy: academic_year & semester text -> semester_id FK
--  4. Audit Trail Completeness: Ensures logged_by FK to profiles(id)
--  5. Canonical vw_transactions relational view for backward compatibility
-- ==============================================================================

-- ==============================================================================
-- 1. Create transaction_receipts Table (Resolves 1NF non-atomic repeating array)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index foreign keys for performant join scans
CREATE INDEX IF NOT EXISTS idx_transaction_receipts_tx_id 
  ON public.transaction_receipts(transaction_id);

CREATE INDEX IF NOT EXISTS idx_transaction_receipts_uploaded_by 
  ON public.transaction_receipts(uploaded_by);

-- Enable Row-Level Security on transaction_receipts
ALTER TABLE public.transaction_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transaction_receipts
DROP POLICY IF EXISTS "transaction_receipts_select_policy" ON public.transaction_receipts;
CREATE POLICY "transaction_receipts_select_policy"
  ON public.transaction_receipts FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "transaction_receipts_insert_policy" ON public.transaction_receipts;
CREATE POLICY "transaction_receipts_insert_policy"
  ON public.transaction_receipts FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "transaction_receipts_delete_policy" ON public.transaction_receipts;
CREATE POLICY "transaction_receipts_delete_policy"
  ON public.transaction_receipts FOR DELETE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- ==============================================================================
-- 2. Data Migration: Populate transaction_receipts from legacy columns
-- ==============================================================================
-- Migrate from receipt_urls array
INSERT INTO public.transaction_receipts (transaction_id, file_url, uploaded_by, uploaded_at)
SELECT 
  t.id, 
  unnest(t.receipt_urls), 
  t.logged_by, 
  t.created_at
FROM public.transactions t
WHERE t.receipt_urls IS NOT NULL 
  AND cardinality(t.receipt_urls) > 0
ON CONFLICT DO NOTHING;

-- Migrate any single receipt_url not already captured
INSERT INTO public.transaction_receipts (transaction_id, file_url, uploaded_by, uploaded_at)
SELECT 
  t.id, 
  t.receipt_url, 
  t.logged_by, 
  t.created_at
FROM public.transactions t
WHERE t.receipt_url IS NOT NULL 
  AND t.receipt_url NOT LIKE 'blob:%'
  AND NOT EXISTS (
    SELECT 1 FROM public.transaction_receipts tr 
    WHERE tr.transaction_id = t.id AND tr.file_url = t.receipt_url
  )
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. Normalize Semester Reference (Add semester_id FK to transactions)
-- ==============================================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_transactions_semester_id 
  ON public.transactions(semester_id);

-- Backfill semester_id based on academic_year and semester
UPDATE public.transactions t
SET semester_id = s.id
FROM public.semesters s
WHERE t.semester_id IS NULL
  AND t.academic_year = s.academic_year
  AND t.semester = s.semester;

-- Fallback for unmatched rows: assign active semester
UPDATE public.transactions t
SET semester_id = s.id
FROM public.semesters s
WHERE t.semester_id IS NULL
  AND s.is_active = TRUE;

-- ==============================================================================
-- 4. Normalize Category Reference (Enforce category_id FK)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_category_id 
  ON public.transactions(category_id);

-- Ensure all transactions have category_id populated from category_name
UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE t.category_id IS NULL
  AND LOWER(TRIM(t.category_name)) = LOWER(TRIM(c.name));

-- Fallback: Assign default category matching transaction type if still null
UPDATE public.transactions t
SET category_id = (
  SELECT id FROM public.categories 
  WHERE type = t.type 
  ORDER BY created_at ASC 
  LIMIT 1
)
WHERE t.category_id IS NULL;

-- ==============================================================================
-- 5. Foreign Key & Index on logged_by (Accountability & Audit Trail)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_transactions_logged_by 
  ON public.transactions(logged_by);

-- ==============================================================================
-- 6. Canonical 3NF View: vw_transactions
-- Joins 3NF tables without data anomalies, maintaining full backward compatibility
-- ==============================================================================
CREATE OR REPLACE VIEW public.vw_transactions AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.amount,
  t.type,
  t.payment_method,
  
  -- Category details (Normalized from categories table)
  t.category_id,
  COALESCE(c.name, t.category_name) AS category_name,
  COALESCE(c.description, '') AS category_description,
  
  -- Semester details (Normalized from semesters table)
  t.semester_id,
  COALESCE(s.academic_year, t.academic_year) AS academic_year,
  COALESCE(s.semester, t.semester) AS semester,
  COALESCE(s.label, CONCAT('AY ', t.academic_year, ' • ', t.semester)) AS semester_label,
  
  -- Account/User details (Normalized from profiles table)
  t.logged_by,
  p.full_name AS logged_by_name,
  p.email AS logged_by_email,
  p.role AS logged_by_role,
  p.avatar_url AS logged_by_avatar_url,
  
  -- Transaction Core Attributes
  t.transaction_date,
  t.is_reimbursement,
  t.reimbursement_recipient,
  t.status,
  t.event_name,
  t.receipt_notes,
  
  -- Normalized Receipts aggregation
  COALESCE(
    (
      SELECT array_agg(tr.file_url ORDER BY tr.uploaded_at ASC)
      FROM public.transaction_receipts tr
      WHERE tr.transaction_id = t.id
    ),
    ARRAY[]::TEXT[]
  ) AS receipt_urls,
  (
    SELECT tr.file_url
    FROM public.transaction_receipts tr
    WHERE tr.transaction_id = t.id
    ORDER BY tr.uploaded_at ASC
    LIMIT 1
  ) AS receipt_url,
  
  t.created_at,
  t.updated_at
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
LEFT JOIN public.semesters s ON t.semester_id = s.id
LEFT JOIN public.profiles p ON t.logged_by = p.id;

-- Grant access to the view
GRANT SELECT ON public.vw_transactions TO authenticated, anon;

-- ==============================================================================
-- 7. Sync Trigger: Automatically maintain 3NF FKs on INSERT/UPDATE of transactions
-- Ensures any transaction inserted with category_name or academic_year/semester
-- automatically populates category_id and semester_id.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_transaction_3nf_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Sync category_id if missing but category_name is provided
  IF NEW.category_id IS NULL AND NEW.category_name IS NOT NULL THEN
    SELECT id INTO NEW.category_id
    FROM public.categories
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(NEW.category_name))
    LIMIT 1;
  END IF;

  -- 2. Sync category_name if missing but category_id is provided
  IF NEW.category_name IS NULL AND NEW.category_id IS NOT NULL THEN
    SELECT name INTO NEW.category_name
    FROM public.categories
    WHERE id = NEW.category_id
    LIMIT 1;
  END IF;

  -- 3. Sync semester_id if missing but academic_year & semester are provided
  IF NEW.semester_id IS NULL AND NEW.academic_year IS NOT NULL AND NEW.semester IS NOT NULL THEN
    SELECT id INTO NEW.semester_id
    FROM public.semesters
    WHERE academic_year = NEW.academic_year AND semester = NEW.semester
    LIMIT 1;
  END IF;

  -- 4. If semester_id still null, default to active semester
  IF NEW.semester_id IS NULL THEN
    SELECT id INTO NEW.semester_id
    FROM public.semesters
    WHERE is_active = TRUE
    LIMIT 1;
  END IF;

  -- 5. Sync academic_year and semester from semester_id
  IF NEW.semester_id IS NOT NULL THEN
    SELECT academic_year, semester 
    INTO NEW.academic_year, NEW.semester
    FROM public.semesters
    WHERE id = NEW.semester_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_transaction_3nf_fields ON public.transactions;
CREATE TRIGGER trg_sync_transaction_3nf_fields
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_transaction_3nf_fields();

-- ==============================================================================
-- 8. Sync Trigger: Sync transaction_receipts changes back to transactions.receipt_urls
-- Maintains backward compatibility for legacy clients that still query receipt_urls
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_receipts_to_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_tx_id UUID;
  v_urls TEXT[];
BEGIN
  v_tx_id := COALESCE(NEW.transaction_id, OLD.transaction_id);

  SELECT COALESCE(array_agg(file_url ORDER BY uploaded_at ASC), ARRAY[]::TEXT[])
  INTO v_urls
  FROM public.transaction_receipts
  WHERE transaction_id = v_tx_id;

  UPDATE public.transactions
  SET 
    receipt_urls = v_urls,
    receipt_url = CASE WHEN cardinality(v_urls) > 0 THEN v_urls[1] ELSE NULL END
  WHERE id = v_tx_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_receipts_to_transaction ON public.transaction_receipts;
CREATE TRIGGER trg_sync_receipts_to_transaction
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_receipts
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_receipts_to_transaction();
