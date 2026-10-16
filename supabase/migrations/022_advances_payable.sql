-- ==============================================================================
-- FinLITE Database Migration 022: Advances Payable & Partial Reimbursements Subsystem
-- Tracks out-of-pocket advances (abono) by officers and advisers with full installment parity
-- Seamlessly integrates with the general ledger (OUTFLOW on disbursement)
-- ==============================================================================

-- 1. Create advance_status enum if not exists
DO $$ BEGIN
  CREATE TYPE advance_status AS ENUM ('UNPAID', 'PARTIALLY_REIMBURSED', 'SETTLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create advances_payable table (Parent Table)
CREATE TABLE IF NOT EXISTS public.advances_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id TEXT NOT NULL DEFAULT 'sem-26-27-1',
  claimant_name TEXT NOT NULL CHECK (char_length(trim(claimant_name)) > 0),
  claimant_contact TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  event_name TEXT,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  amount_reimbursed NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_reimbursed >= 0),
  status advance_status NOT NULL DEFAULT 'UNPAID',
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  receipt_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast querying by semester, status, and creation date
CREATE INDEX IF NOT EXISTS idx_advances_payable_sem_status ON public.advances_payable (semester_id, status);
CREATE INDEX IF NOT EXISTS idx_advances_payable_created_at ON public.advances_payable (created_at DESC);

-- 3. Create advance_disbursements table (Child Table - Tracks Installment Disbursements)
CREATE TABLE IF NOT EXISTS public.advance_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id UUID NOT NULL REFERENCES public.advances_payable(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  disbursement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disbursed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advance_disbursements_adv_id ON public.advance_disbursements (advance_id, disbursement_date DESC);
CREATE INDEX IF NOT EXISTS idx_advance_disbursements_tx_id ON public.advance_disbursements (transaction_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.advances_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_disbursements ENABLE ROW LEVEL SECURITY;

-- Read policies: Authenticated users can view advances and disbursement history
DROP POLICY IF EXISTS "Allow authenticated read advances_payable" ON public.advances_payable;
CREATE POLICY "Allow authenticated read advances_payable"
  ON public.advances_payable FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read advance_disbursements" ON public.advance_disbursements;
CREATE POLICY "Allow authenticated read advance_disbursements"
  ON public.advance_disbursements FOR SELECT
  TO authenticated
  USING (true);

-- Manage policies: Club officers and admins can insert, update, delete
DROP POLICY IF EXISTS "Allow officers to insert advances_payable" ON public.advances_payable;
CREATE POLICY "Allow officers to insert advances_payable"
  ON public.advances_payable FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to update advances_payable" ON public.advances_payable;
CREATE POLICY "Allow officers to update advances_payable"
  ON public.advances_payable FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to delete advances_payable" ON public.advances_payable;
CREATE POLICY "Allow officers to delete advances_payable"
  ON public.advances_payable FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to insert advance_disbursements" ON public.advance_disbursements;
CREATE POLICY "Allow officers to insert advance_disbursements"
  ON public.advance_disbursements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

-- 5. Safe Backfill from existing transactions with is_reimbursement = true
INSERT INTO public.advances_payable (
  id, semester_id, claimant_name, title, category_id, category_name, event_name,
  total_amount, amount_reimbursed, status, advance_date, receipt_url, receipt_urls, notes, created_at
)
SELECT 
  t.id,
  COALESCE(t.semester_id::text, 'sem-26-27-1'),
  COALESCE(t.reimbursement_recipient, 'Club Officer'),
  t.title,
  t.category_id,
  t.category_name,
  t.event_name,
  t.amount,
  CASE WHEN t.status = 'REIMBURSED' THEN t.amount ELSE 0.00 END,
  CASE WHEN t.status = 'REIMBURSED' THEN 'SETTLED'::advance_status ELSE 'UNPAID'::advance_status END,
  t.transaction_date,
  t.receipt_url,
  COALESCE(t.receipt_urls, ARRAY[]::TEXT[]),
  t.description,
  t.created_at
FROM public.transactions t
WHERE t.is_reimbursement = TRUE
ON CONFLICT (id) DO NOTHING;
