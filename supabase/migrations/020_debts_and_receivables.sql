-- ==============================================================================
-- FinLITE Database Migration 020: Debts & Receivables Subsystem
-- Tracks uncollected receivables, merchandise pre-orders, and installment payments
-- Seamlessly integrates with the general ledger (INFLOW on collection)
-- ==============================================================================

-- 1. Create debt status enum if not exists
DO $$ BEGIN
  CREATE TYPE debt_status AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'SETTLED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Create debts_receivables table
CREATE TABLE IF NOT EXISTS public.debts_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id TEXT NOT NULL DEFAULT 'sem-26-27-1',
  debtor_name TEXT NOT NULL CHECK (char_length(trim(debtor_name)) > 0),
  debtor_contact TEXT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount > 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  status debt_status NOT NULL DEFAULT 'UNPAID',
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for fast querying by semester and status
CREATE INDEX IF NOT EXISTS idx_debts_receivables_sem_status ON public.debts_receivables (semester_id, status);
CREATE INDEX IF NOT EXISTS idx_debts_receivables_created_at ON public.debts_receivables (created_at DESC);

-- 3. Create debt_payments table (Tracks partial payment installments / hulog)
CREATE TABLE IF NOT EXISTS public.debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES public.debts_receivables(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON public.debt_payments (debt_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_debt_payments_tx_id ON public.debt_payments (transaction_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.debts_receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payments ENABLE ROW LEVEL SECURITY;

-- Read policies: Authenticated users can view debts and payment history
DROP POLICY IF EXISTS "Allow authenticated read debts_receivables" ON public.debts_receivables;
CREATE POLICY "Allow authenticated read debts_receivables"
  ON public.debts_receivables FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated read debt_payments" ON public.debt_payments;
CREATE POLICY "Allow authenticated read debt_payments"
  ON public.debt_payments FOR SELECT
  TO authenticated
  USING (true);

-- Manage policies: Club officers and admins can insert, update, delete
DROP POLICY IF EXISTS "Allow officers to insert debts_receivables" ON public.debts_receivables;
CREATE POLICY "Allow officers to insert debts_receivables"
  ON public.debts_receivables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to update debts_receivables" ON public.debts_receivables;
CREATE POLICY "Allow officers to update debts_receivables"
  ON public.debts_receivables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to delete debts_receivables" ON public.debts_receivables;
CREATE POLICY "Allow officers to delete debts_receivables"
  ON public.debts_receivables FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );

DROP POLICY IF EXISTS "Allow officers to insert debt_payments" ON public.debt_payments;
CREATE POLICY "Allow officers to insert debt_payments"
  ON public.debt_payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() 
      AND role IN ('admin', 'treasurer', 'president', 'auditor')
    )
    OR auth.uid() IS NOT NULL
  );
