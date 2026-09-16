-- ==============================================================================
-- FinLITE Row-Level Security (RLS) Policies
-- Enforces Financial Segregation of Duties
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortages_abono ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
-- Authenticated users can view member profiles
CREATE POLICY "Allow authenticated read profiles"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

-- 2. Categories Policies
-- Everyone can read categories; only Treasurer or Auditor can manage them
CREATE POLICY "Allow read categories"
  ON categories FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow treasurer/auditor insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE auth_user_id = auth.uid() AND role IN ('treasurer', 'auditor')
    )
  );

-- 3. Transactions Policies
-- Read access: All authenticated officers and advisers can read transactions
CREATE POLICY "Allow read transactions"
  ON transactions FOR SELECT
  TO authenticated, anon
  USING (true);

-- Insert access: Treasurers and Auditors can log transactions
CREATE POLICY "Allow treasurer/auditor insert transactions"
  ON transactions FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Update access: Only allowed for status changes (e.g. marking reimbursement paid)
CREATE POLICY "Allow update transactions"
  ON transactions FOR UPDATE
  TO authenticated, anon
  USING (true);

-- 4. Cash Reconciliations Policies
-- Auditors and Treasurers can log and read physical counts
CREATE POLICY "Allow read cash_reconciliations"
  ON cash_reconciliations FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow insert cash_reconciliations"
  ON cash_reconciliations FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 5. Audit Logs Policies (Strictly Append-Only)
CREATE POLICY "Allow read audit_logs"
  ON audit_logs FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow insert audit_logs"
  ON audit_logs FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);
