-- ==============================================================================
-- FinLITE Database Schema: Core Financial Ledger & Segregation of Duties
-- Compliant with PDM CCS Institutional Audit Standards
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('treasurer', 'auditor', 'president', 'adviser');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('INFLOW', 'OUTFLOW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('CASH', 'GCASH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_status AS ENUM ('COMPLETED', 'PENDING_REIMBURSEMENT', 'REIMBURSED', 'FLAGGED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. User Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'treasurer',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Transactions Ledger
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  type transaction_type NOT NULL,
  payment_method payment_method NOT NULL DEFAULT 'CASH',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  logged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  receipt_notes TEXT,
  is_reimbursement BOOLEAN NOT NULL DEFAULT FALSE,
  reimbursement_recipient TEXT,
  status transaction_status NOT NULL DEFAULT 'COMPLETED',
  event_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Physical Cash Reconciliations (Cashbox Denomination Count)
CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  counted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Bill counts
  bills_1000 INT NOT NULL DEFAULT 0,
  bills_500 INT NOT NULL DEFAULT 0,
  bills_200 INT NOT NULL DEFAULT 0,
  bills_100 INT NOT NULL DEFAULT 0,
  bills_50 INT NOT NULL DEFAULT 0,
  bills_20 INT NOT NULL DEFAULT 0,
  
  -- Coin counts
  coins_20 INT NOT NULL DEFAULT 0,
  coins_10 INT NOT NULL DEFAULT 0,
  coins_5 INT NOT NULL DEFAULT 0,
  coins_1 INT NOT NULL DEFAULT 0,
  coins_cents INT NOT NULL DEFAULT 0,
  
  -- Totals
  physical_total NUMERIC(12, 2) NOT NULL,
  ledger_cash_balance NUMERIC(12, 2) NOT NULL,
  variance_amount NUMERIC(12, 2) NOT NULL,
  variance_status TEXT NOT NULL DEFAULT 'BALANCED',
  
  notes TEXT,
  adviser_approval_notes TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'VERIFIED'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Shortages & Abono Tracker
CREATE TABLE IF NOT EXISTS shortages_abono (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID REFERENCES cash_reconciliations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'SHORTAGE' or 'ABONO'
  amount NUMERIC(12, 2) NOT NULL,
  handled_by TEXT NOT NULL,
  justification TEXT NOT NULL,
  is_approved_by_adviser BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Audit Logs Table (Immutable History)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Stored Procedure: Get Real-Time Grounded Financial Summary
CREATE OR REPLACE FUNCTION get_financial_summary()
RETURNS JSON AS $$
DECLARE
  v_total_inflows NUMERIC(12, 2);
  v_total_outflows NUMERIC(12, 2);
  v_cash_on_hand NUMERIC(12, 2);
  v_gcash_balance NUMERIC(12, 2);
  v_pending_reimbursements NUMERIC(12, 2);
BEGIN
  -- Compute Total Inflows
  SELECT COALESCE(SUM(amount), 0) INTO v_total_inflows
  FROM transactions WHERE type = 'INFLOW';

  -- Compute Total Outflows
  SELECT COALESCE(SUM(amount), 0) INTO v_total_outflows
  FROM transactions WHERE type = 'OUTFLOW' AND status != 'PENDING_REIMBURSEMENT';

  -- Compute Cash on Hand (Cash Inflows - Cash Outflows)
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE -amount END), 0)
  INTO v_cash_on_hand
  FROM transactions
  WHERE payment_method = 'CASH' AND status != 'PENDING_REIMBURSEMENT';

  -- Compute GCash Balance
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'INFLOW' THEN amount ELSE -amount END), 0)
  INTO v_gcash_balance
  FROM transactions
  WHERE payment_method = 'GCASH' AND status != 'PENDING_REIMBURSEMENT';

  -- Compute Pending Reimbursements (Advances awaiting payout)
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_reimbursements
  FROM transactions
  WHERE is_reimbursement = TRUE AND status = 'PENDING_REIMBURSEMENT';

  RETURN json_build_object(
    'total_inflows', v_total_inflows,
    'total_outflows', v_total_outflows,
    'net_balance', (v_total_inflows - v_total_outflows),
    'cash_on_hand', v_cash_on_hand,
    'gcash_balance', v_gcash_balance,
    'pending_reimbursements', v_pending_reimbursements
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
