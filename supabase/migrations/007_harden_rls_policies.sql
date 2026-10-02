-- ==============================================================================
-- FinLITE Migration 007: Hardened Row-Level Security (RLS) & Segregation of Duties
-- Fixes critical vulnerability where USING (true) on anon allowed unauthorized CRUD
-- ==============================================================================

-- 1. Helper Functions (SECURITY DEFINER to avoid infinite recursion in RLS policies)

-- Checks if caller is an authorized Admin or designated Super Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  caller_email text;
  is_super boolean := false;
BEGIN
  -- Extract email from Supabase Auth JWT
  caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  -- Designated Super Admin check
  IF caller_email IN ('geronimoandreijohn.pdm@gmail.com', 'geronimoandreiojohn.pdm@gmail.com') THEN
    RETURN true;
  END IF;

  -- Check if user has an approved profile with 'admin' role
  IF auth.uid() IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid()
        AND role = 'admin'
        AND status = 'approved'
    );
  END IF;

  RETURN false;
END;
$$;

-- Returns the active role of an approved member
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_role text;
BEGIN
  IF public.is_admin() THEN
    RETURN 'admin';
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role::text INTO v_role
  FROM public.profiles
  WHERE auth_user_id = auth.uid()
    AND status = 'approved'
  LIMIT 1;

  RETURN v_role;
END;
$$;

-- Checks if caller is an approved member of LITE
CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.is_admin() THEN
    RETURN true;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND status = 'approved'
  );
END;
$$;

-- Grant execution of helper functions to authenticated & anon
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_approved_member() TO authenticated, anon;

-- ==============================================================================
-- 2. Ensure RLS is enabled on all sensitive tables
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortages_abono ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. PROFILES Table Hardening
-- ==============================================================================
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual update own profile" ON public.profiles;

-- SELECT: Approved members can see member directory; users can always see their own profile; admins can see all
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved_member()
    OR (auth_user_id = auth.uid())
  );

-- INSERT: Authenticated users can insert their own profile upon initial onboarding
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_user_id = auth.uid()
    OR public.is_admin()
  );

-- UPDATE:
-- - Admins can update any profile (change roles, approve/reject).
-- - Non-admins can ONLY update their own profile and CANNOT modify role or status.
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (auth_user_id = auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR (
      auth_user_id = auth.uid()
      AND role = (SELECT p.role FROM public.profiles p WHERE p.auth_user_id = auth.uid())
      AND status = (SELECT p.status FROM public.profiles p WHERE p.auth_user_id = auth.uid())
    )
  );

-- DELETE: Only admins
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 4. REGISTRATION_REQUESTS Table Hardening
-- ==============================================================================
DROP POLICY IF EXISTS "Allow public insert registration_requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Allow authenticated read registration_requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Allow authenticated update registration_requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Allow public update registration_requests" ON public.registration_requests;

-- INSERT: Anyone (anon or authenticated) can submit a registration request
CREATE POLICY "registration_requests_insert_policy"
  ON public.registration_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- SELECT: Only Admins can view submitted registration requests
CREATE POLICY "registration_requests_select_policy"
  ON public.registration_requests FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- UPDATE: Only Admins can review, approve, or reject requests
CREATE POLICY "registration_requests_update_policy"
  ON public.registration_requests FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- DELETE: Only Admins can delete requests
CREATE POLICY "registration_requests_delete_policy"
  ON public.registration_requests FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 5. TRANSACTIONS Table Hardening
-- ==============================================================================
DROP POLICY IF EXISTS "Allow read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow treasurer/auditor insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow update transactions" ON public.transactions;

-- SELECT: Approved members and admins can read transactions
CREATE POLICY "transactions_select_policy"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved_member()
  );

-- INSERT: Only Treasurers, Auditors, and Admins can log transactions
CREATE POLICY "transactions_insert_policy"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- UPDATE: Only Treasurers, Auditors, and Admins can edit or update transaction statuses
CREATE POLICY "transactions_update_policy"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

-- DELETE: Only Admins can delete transactions
CREATE POLICY "transactions_delete_policy"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 6. CASH_RECONCILIATIONS Table Hardening
-- ==============================================================================
DROP POLICY IF EXISTS "Allow read cash_reconciliations" ON public.cash_reconciliations;
DROP POLICY IF EXISTS "Allow insert cash_reconciliations" ON public.cash_reconciliations;

-- SELECT: Approved members and admins can read physical cash counts
CREATE POLICY "cash_reconciliations_select_policy"
  ON public.cash_reconciliations FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_approved_member()
  );

-- INSERT: Only Auditors, Treasurers, and Admins can record cash counts
CREATE POLICY "cash_reconciliations_insert_policy"
  ON public.cash_reconciliations FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('auditor', 'treasurer')
  );

-- DELETE: Only Admins can delete cash reconciliation audits
CREATE POLICY "cash_reconciliations_delete_policy"
  ON public.cash_reconciliations FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 7. CATEGORIES Table Hardening
-- ==============================================================================
DROP POLICY IF EXISTS "Allow read categories" ON public.categories;
DROP POLICY IF EXISTS "Allow treasurer/auditor insert categories" ON public.categories;

-- SELECT: Public and authenticated users can view transaction categories
CREATE POLICY "categories_select_policy"
  ON public.categories FOR SELECT
  TO authenticated, anon
  USING (true);

-- INSERT/UPDATE/DELETE: Only Treasurers, Auditors, and Admins can manage categories
CREATE POLICY "categories_insert_policy"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

CREATE POLICY "categories_update_policy"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  )
  WITH CHECK (
    public.is_admin()
    OR public.current_user_role() IN ('treasurer', 'auditor')
  );

CREATE POLICY "categories_delete_policy"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ==============================================================================
-- 8. AUDIT_LOGS Table Hardening (Append-Only)
-- ==============================================================================
DROP POLICY IF EXISTS "Allow read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow insert audit_logs" ON public.audit_logs;

-- SELECT: Only Auditors and Admins can inspect audit trails
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('auditor')
  );

-- INSERT: Authenticated system actions can append logs
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
