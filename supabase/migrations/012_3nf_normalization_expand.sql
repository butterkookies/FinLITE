-- ==============================================================================
-- FinLITE Database Migration 012: 3NF Normalization Expand Phase
-- Zero-Downtime Database Refactoring: Additive Tables, Shadow Columns, Triggers
-- Compliant with PDM CCS Institutional Audit Standards & 3NF Relational Standards
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Denominations Reference Table (Eliminates 1NF Repeating Groups)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.denominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,                       -- e.g. 'BILL_1000', 'COIN_20', 'COIN_CENT'
  label TEXT NOT NULL,                             -- e.g. '₱1,000 Bill', '₱20 Coin', '25¢ Coin'
  currency_type TEXT NOT NULL CHECK (currency_type IN ('BILL', 'COIN')),
  face_value NUMERIC(12, 2) NOT NULL CHECK (face_value > 0),
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed standard Philippine Peso denominations
INSERT INTO public.denominations (code, label, currency_type, face_value, display_order) VALUES
  ('BILL_1000', '₱1,000 Bill', 'BILL', 1000.00, 1),
  ('BILL_500',  '₱500 Bill',   'BILL',  500.00, 2),
  ('BILL_200',  '₱200 Bill',   'BILL',  200.00, 3),
  ('BILL_100',  '₱100 Bill',   'BILL',  100.00, 4),
  ('BILL_50',   '₱50 Bill',    'BILL',   50.00, 5),
  ('BILL_20',   '₱20 Bill',    'BILL',   20.00, 6),
  ('COIN_20',   '₱20 Coin',    'COIN',   20.00, 7),
  ('COIN_10',   '₱10 Coin',    'COIN',   10.00, 8),
  ('COIN_5',    '₱5 Coin',     'COIN',    5.00, 9),
  ('COIN_1',    '₱1 Coin',     'COIN',    1.00, 10),
  ('COIN_CENT', '25¢ Coin',    'COIN',    0.25, 11)
ON CONFLICT (code) DO UPDATE SET
  face_value = EXCLUDED.face_value,
  display_order = EXCLUDED.display_order;

-- Enable RLS for denominations
ALTER TABLE public.denominations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "denominations_select_policy" ON public.denominations;
CREATE POLICY "denominations_select_policy"
  ON public.denominations FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "denominations_manage_policy" ON public.denominations;
CREATE POLICY "denominations_manage_policy"
  ON public.denominations FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- ------------------------------------------------------------------------------
-- 2. Create Cash Reconciliation Items (Normalized 1:N Child Table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.cash_reconciliations(id) ON DELETE CASCADE,
  denomination_id UUID NOT NULL REFERENCES public.denominations(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity >= 0),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reconciliation_id, denomination_id)
);

ALTER TABLE public.cash_reconciliation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_reconciliation_items_select_policy" ON public.cash_reconciliation_items;
CREATE POLICY "cash_reconciliation_items_select_policy"
  ON public.cash_reconciliation_items FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "cash_reconciliation_items_insert_policy" ON public.cash_reconciliation_items;
CREATE POLICY "cash_reconciliation_items_insert_policy"
  ON public.cash_reconciliation_items FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "cash_reconciliation_items_update_policy" ON public.cash_reconciliation_items;
CREATE POLICY "cash_reconciliation_items_update_policy"
  ON public.cash_reconciliation_items FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "cash_reconciliation_items_delete_policy" ON public.cash_reconciliation_items;
CREATE POLICY "cash_reconciliation_items_delete_policy"
  ON public.cash_reconciliation_items FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 3. Create Transaction Receipts (Normalized 1:N Child Table - Eliminates 1NF Array)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  storage_path TEXT,                                -- Internal bucket key, e.g. 'receipts/xyz.jpg'
  public_url TEXT NOT NULL,
  file_name TEXT,
  file_size_bytes INT,
  mime_type TEXT,
  sort_order INT NOT NULL DEFAULT 0 CHECK (sort_order >= 0 AND sort_order < 3),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (transaction_id, sort_order)
);

ALTER TABLE public.transaction_receipts ENABLE ROW LEVEL SECURITY;

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
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "transaction_receipts_update_policy" ON public.transaction_receipts;
CREATE POLICY "transaction_receipts_update_policy"
  ON public.transaction_receipts FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR public.current_user_role() IN ('treasurer', 'auditor')
  );

DROP POLICY IF EXISTS "transaction_receipts_delete_policy" ON public.transaction_receipts;
CREATE POLICY "transaction_receipts_delete_policy"
  ON public.transaction_receipts FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 4. Add Shadow FK Columns to Existing Tables
-- ------------------------------------------------------------------------------
-- transactions.semester_id
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT;

-- cash_reconciliations.semester_id
ALTER TABLE public.cash_reconciliations
  ADD COLUMN IF NOT EXISTS semester_id UUID REFERENCES public.semesters(id) ON DELETE RESTRICT;

-- shortages_abono.handled_by_profile_id
ALTER TABLE public.shortages_abono
  ADD COLUMN IF NOT EXISTS handled_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- registration_requests.approved_profile_id
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS approved_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 5. Backfill Existing Data to New Normalized Structures
-- ------------------------------------------------------------------------------

-- 5.1 Backfill transactions.semester_id from academic_year and semester
UPDATE public.transactions t
SET semester_id = s.id
FROM public.semesters s
WHERE t.semester_id IS NULL
  AND t.academic_year = s.academic_year
  AND t.semester = s.semester;

-- Fallback for unmatched transactions to the active semester
UPDATE public.transactions
SET semester_id = (SELECT id FROM public.semesters WHERE is_active = TRUE LIMIT 1)
WHERE semester_id IS NULL;

-- 5.2 Backfill transactions.category_id from category_name if null
UPDATE public.transactions t
SET category_id = c.id
FROM public.categories c
WHERE t.category_id IS NULL
  AND t.category_name IS NOT NULL
  AND lower(t.category_name) = lower(c.name);

-- 5.3 Backfill transaction_receipts from receipt_urls and receipt_url
DO $$
DECLARE
  r RECORD;
  url TEXT;
  idx INT;
BEGIN
  FOR r IN SELECT id, receipt_url, receipt_urls FROM public.transactions WHERE receipt_urls IS NOT NULL OR receipt_url IS NOT NULL LOOP
    idx := 0;
    IF r.receipt_urls IS NOT NULL AND cardinality(r.receipt_urls) > 0 THEN
      FOREACH url IN ARRAY r.receipt_urls LOOP
        IF url IS NOT NULL AND url != '' THEN
          INSERT INTO public.transaction_receipts (transaction_id, public_url, sort_order)
          VALUES (r.id, url, idx)
          ON CONFLICT (transaction_id, sort_order) DO UPDATE SET public_url = EXCLUDED.public_url;
          idx := idx + 1;
        END IF;
      END LOOP;
    ELSIF r.receipt_url IS NOT NULL AND r.receipt_url != '' THEN
      INSERT INTO public.transaction_receipts (transaction_id, public_url, sort_order)
      VALUES (r.id, r.receipt_url, 0)
      ON CONFLICT (transaction_id, sort_order) DO UPDATE SET public_url = EXCLUDED.public_url;
    END IF;
  END LOOP;
END $$;

-- 5.4 Backfill cash_reconciliation_items from existing cash_reconciliations
DO $$
DECLARE
  r RECORD;
  d_id UUID;
  d_val NUMERIC;
BEGIN
  FOR r IN SELECT * FROM public.cash_reconciliations LOOP
    -- Assign active semester if null
    IF r.semester_id IS NULL THEN
      UPDATE public.cash_reconciliations
      SET semester_id = (SELECT id FROM public.semesters WHERE is_active = TRUE LIMIT 1)
      WHERE id = r.id;
    END IF;

    -- Map each denomination
    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_1000' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_1000, r.bills_1000 * d_val)
      ON CONFLICT (reconciliation_id, denomination_id) DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_500' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_500, r.bills_500 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_200' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_200, r.bills_200 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_100' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_100, r.bills_100 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_50' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_50, r.bills_50 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'BILL_20' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.bills_20, r.bills_20 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'COIN_20' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.coins_20, r.coins_20 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'COIN_10' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.coins_10, r.coins_10 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'COIN_5' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.coins_5, r.coins_5 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'COIN_1' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.coins_1, r.coins_1 * d_val) ON CONFLICT DO NOTHING;
    END LOOP;

    FOR d_id, d_val IN SELECT id, face_value FROM public.denominations WHERE code = 'COIN_CENT' LOOP
      INSERT INTO public.cash_reconciliation_items (reconciliation_id, denomination_id, quantity, subtotal)
      VALUES (r.id, d_id, r.coins_cents, r.coins_cents * d_val) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- 5.5 Backfill shortages_abono.handled_by_profile_id from handled_by text
UPDATE public.shortages_abono sa
SET handled_by_profile_id = p.id
FROM public.profiles p
WHERE sa.handled_by_profile_id IS NULL
  AND (
    lower(sa.handled_by) = lower(p.full_name)
    OR lower(sa.handled_by) = lower(p.email)
    OR lower(sa.handled_by) LIKE '%' || lower(p.last_name) || '%'
  );

-- Default fallback to first admin/treasurer profile for existing audit rows
UPDATE public.shortages_abono
SET handled_by_profile_id = (SELECT id FROM public.profiles WHERE role IN ('treasurer', 'admin') LIMIT 1)
WHERE handled_by_profile_id IS NULL;

-- 5.6 Backfill registration_requests.approved_profile_id
UPDATE public.registration_requests rr
SET approved_profile_id = p.id
FROM public.profiles p
WHERE rr.status = 'approved'
  AND rr.approved_profile_id IS NULL
  AND rr.email = p.email;

-- ------------------------------------------------------------------------------
-- 6. Deploy Dual-Writing Synchronization Triggers
-- ------------------------------------------------------------------------------

-- Trigger 1: Transactions Sync Trigger (Forward & Backward Compatibility)
CREATE OR REPLACE FUNCTION public.fn_sync_transactions_3nf()
RETURNS TRIGGER AS $$
DECLARE
  v_cat_name TEXT;
  v_sem_year TEXT;
  v_sem_term TEXT;
BEGIN
  -- 1. Forward-fill: If category_name supplied without category_id, lookup category_id
  IF NEW.category_id IS NULL AND NEW.category_name IS NOT NULL THEN
    SELECT id INTO NEW.category_id FROM public.categories WHERE lower(name) = lower(NEW.category_name) LIMIT 1;
  END IF;

  -- 2. Reverse-fill: If category_id supplied, synchronize category_name
  IF NEW.category_id IS NOT NULL THEN
    SELECT name INTO v_cat_name FROM public.categories WHERE id = NEW.category_id;
    NEW.category_name := v_cat_name;
  END IF;

  -- 3. Forward-fill: If academic_year & semester supplied without semester_id, lookup semester_id
  IF NEW.semester_id IS NULL AND NEW.academic_year IS NOT NULL AND NEW.semester IS NOT NULL THEN
    SELECT id INTO NEW.semester_id FROM public.semesters 
    WHERE academic_year = NEW.academic_year AND semester = NEW.semester LIMIT 1;
  END IF;

  -- 4. Reverse-fill: If semester_id supplied, synchronize academic_year & semester text
  IF NEW.semester_id IS NOT NULL THEN
    SELECT academic_year, semester INTO v_sem_year, v_sem_term FROM public.semesters WHERE id = NEW.semester_id;
    NEW.academic_year := v_sem_year;
    NEW.semester := v_sem_term;
  END IF;

  -- 5. Forward-fill: If receipt_urls provided, ensure receipt_url is first element
  IF NEW.receipt_urls IS NOT NULL AND cardinality(NEW.receipt_urls) > 0 THEN
    NEW.receipt_url := NEW.receipt_urls[1];
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_transactions_3nf ON public.transactions;
CREATE TRIGGER trg_sync_transactions_3nf
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_transactions_3nf();

-- Trigger 2: Sync transaction_receipts child records when transactions.receipt_urls updated
CREATE OR REPLACE FUNCTION public.fn_sync_transaction_receipts_from_array()
RETURNS TRIGGER AS $$
DECLARE
  url TEXT;
  idx INT := 0;
BEGIN
  IF NEW.receipt_urls IS NOT NULL THEN
    DELETE FROM public.transaction_receipts WHERE transaction_id = NEW.id;
    FOREACH url IN ARRAY NEW.receipt_urls LOOP
      IF url IS NOT NULL AND url != '' THEN
        INSERT INTO public.transaction_receipts (transaction_id, public_url, sort_order)
        VALUES (NEW.id, url, idx);
        idx := idx + 1;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_transaction_receipts_from_array ON public.transactions;
CREATE TRIGGER trg_sync_transaction_receipts_from_array
  AFTER INSERT OR UPDATE OF receipt_urls ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_transaction_receipts_from_array();

-- Trigger 3: Sync cash_reconciliations counted_by and verified_by ID resolution
CREATE OR REPLACE FUNCTION public.fn_resolve_reconciliation_officers()
RETURNS TRIGGER AS $$
DECLARE
  v_prof_id UUID;
BEGIN
  -- If counted_by is an auth_user_id instead of profiles.id, resolve to profiles.id
  IF NEW.counted_by IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.counted_by) THEN
      SELECT id INTO v_prof_id FROM public.profiles WHERE auth_user_id = NEW.counted_by;
      IF v_prof_id IS NOT NULL THEN
        NEW.counted_by := v_prof_id;
      END IF;
    END IF;
  END IF;

  -- If verified_by is an auth_user_id, resolve to profiles.id
  IF NEW.verified_by IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.verified_by) THEN
      SELECT id INTO v_prof_id FROM public.profiles WHERE auth_user_id = NEW.verified_by;
      IF v_prof_id IS NOT NULL THEN
        NEW.verified_by := v_prof_id;
      END IF;
    END IF;
  END IF;

  -- Default semester_id if null
  IF NEW.semester_id IS NULL THEN
    SELECT id INTO NEW.semester_id FROM public.semesters WHERE is_active = TRUE LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resolve_reconciliation_officers ON public.cash_reconciliations;
CREATE TRIGGER trg_resolve_reconciliation_officers
  BEFORE INSERT OR UPDATE ON public.cash_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.fn_resolve_reconciliation_officers();

-- Trigger 4: Profiles full_name synchronization trigger for Phase 1
CREATE OR REPLACE FUNCTION public.fn_sync_profiles_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.first_name IS NOT NULL OR NEW.last_name IS NOT NULL THEN
    NEW.full_name := TRIM(CONCAT_WS(' ', NULLIF(NEW.first_name, ''), NULLIF(NEW.last_name, '')));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_full_name ON public.profiles;
CREATE TRIGGER trg_sync_profiles_full_name
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_profiles_full_name();

-- Re-establish formal foreign keys on cash_reconciliations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_reconciliations_counted_by_fkey'
  ) THEN
    ALTER TABLE public.cash_reconciliations
      ADD CONSTRAINT cash_reconciliations_counted_by_fkey
        FOREIGN KEY (counted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'cash_reconciliations_verified_by_fkey'
  ) THEN
    ALTER TABLE public.cash_reconciliations
      ADD CONSTRAINT cash_reconciliations_verified_by_fkey
        FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 7. Deploy Updatable Views for Transparent Backwards Compatibility
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_transactions_normalized AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.amount,
  t.type,
  t.payment_method,
  t.category_id,
  c.name AS category_name,
  t.semester_id,
  s.academic_year,
  s.semester,
  s.label AS semester_label,
  t.logged_by,
  p.full_name AS logged_by_name,
  t.transaction_date,
  t.is_reimbursement,
  t.reimbursement_recipient,
  t.status,
  t.event_name,
  t.created_at,
  t.updated_at,
  COALESCE(
    (SELECT array_agg(tr.public_url ORDER BY tr.sort_order)
     FROM public.transaction_receipts tr WHERE tr.transaction_id = t.id),
    ARRAY[]::TEXT[]
  ) AS receipt_urls,
  (SELECT tr.public_url FROM public.transaction_receipts tr WHERE tr.transaction_id = t.id AND tr.sort_order = 0 LIMIT 1) AS receipt_url
FROM public.transactions t
LEFT JOIN public.categories c ON t.category_id = c.id
LEFT JOIN public.semesters s ON t.semester_id = s.id
LEFT JOIN public.profiles p ON t.logged_by = p.id;
