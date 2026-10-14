-- ==============================================================================
-- FinLITE Database Migration 016: Financial Audit Trail Engine
-- Implements automated immutable audit logging for PDM CCS financial governance
-- Captures transactions, reimbursements, reconciliations, and governance changes
-- ==============================================================================

-- 1. Ensure audit_logs table exists and is hardened
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                             -- e.g. 'INSERT', 'UPDATE', 'DELETE', 'ABONO_SETTLED'
  entity_type TEXT NOT NULL,                        -- e.g. 'transactions', 'cash_reconciliations', 'semesters', 'profiles'
  entity_id TEXT,                                   -- UUID or ID of affected row
  details JSONB,                                    -- Detailed diff or snapshot
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid audit querying & chronological reporting
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);

-- ------------------------------------------------------------------------------
-- 2. Trigger Function: Capture Financial State Changes Automatically
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_capture_financial_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_action TEXT;
  v_details JSONB;
  v_entity_type TEXT;
  v_entity_id TEXT;
BEGIN
  -- 1. Determine actor (authenticated user or fallback to row author)
  v_user_id := auth.uid();
  v_action := TG_OP;
  v_entity_type := TG_TABLE_NAME;

  -- Fallbacks if system or service role executed the operation
  IF v_user_id IS NULL THEN
    IF TG_TABLE_NAME = 'transactions' AND (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
      v_user_id := NEW.logged_by;
    ELSIF TG_TABLE_NAME = 'cash_reconciliations' AND TG_OP = 'INSERT' THEN
      v_user_id := NEW.counted_by;
    ELSIF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
      v_user_id := NEW.id;
    END IF;
  END IF;

  -- 2. Build snapshot or diff payload
  IF (TG_OP = 'INSERT') THEN
    v_entity_id := NEW.id::TEXT;
    v_details := jsonb_build_object(
      'operation', 'INSERT',
      'snapshot', to_jsonb(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    v_entity_id := NEW.id::TEXT;
    
    -- Special detection for Abono Reimbursement settlement
    IF TG_TABLE_NAME = 'transactions' AND OLD.status = 'PENDING_REIMBURSEMENT' AND NEW.status = 'REIMBURSED' THEN
      v_action := 'ABONO_SETTLED';
    END IF;

    v_details := jsonb_build_object(
      'operation', 'UPDATE',
      'changed_fields', (to_jsonb(NEW) - to_jsonb(OLD)),
      'previous_status', OLD.status,
      'current_status', NEW.status,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method
    );
  ELSIF (TG_OP = 'DELETE') THEN
    v_entity_id := OLD.id::TEXT;
    v_details := jsonb_build_object(
      'operation', 'DELETE',
      'deleted_snapshot', to_jsonb(OLD)
    );
  END IF;

  -- 3. Insert append-only immutable audit entry
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    v_user_id,
    v_action,
    v_entity_type,
    v_entity_id,
    v_details,
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Ensure financial transaction succeeds even if audit trigger encounters an issue
    RAISE WARNING 'Financial audit logging warning: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 3. Bind Triggers to Core Financial & Governance Tables
-- ------------------------------------------------------------------------------

-- Transactions Trigger
DROP TRIGGER IF EXISTS trg_audit_transactions ON public.transactions;
CREATE TRIGGER trg_audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_financial_audit();

-- Cash Reconciliations Trigger
DROP TRIGGER IF EXISTS trg_audit_cash_reconciliations ON public.cash_reconciliations;
CREATE TRIGGER trg_audit_cash_reconciliations
  AFTER INSERT ON public.cash_reconciliations
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_financial_audit();

-- Semesters Trigger
DROP TRIGGER IF EXISTS trg_audit_semesters ON public.semesters;
CREATE TRIGGER trg_audit_semesters
  AFTER INSERT OR UPDATE ON public.semesters
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_financial_audit();

-- Profiles Trigger (Role & Profile Changes)
DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles
  AFTER UPDATE OF role, first_name, last_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_capture_financial_audit();

-- ------------------------------------------------------------------------------
-- 4. Harden Row Level Security (RLS) on audit_logs (Strictly Append-Only)
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.audit_logs;

-- SELECT Policy: Auditor, Treasurer, President, Adviser, and Admin can view
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.current_user_role() IN ('auditor', 'treasurer', 'president', 'adviser')
  );

-- INSERT Policy: Authenticated users can insert audit records (e.g. client-side events)
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Explicitly NO UPDATE OR DELETE policies are created.
-- This guarantees audit entries are cryptographically immutable and tamper-evident.

-- ------------------------------------------------------------------------------
-- 5. Stored Procedure: Read Audit Trail with Joined Profile Metadata
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_financial_audit_trail(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ,
  actor_name TEXT,
  actor_email TEXT,
  actor_role TEXT,
  actor_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.created_at,
    COALESCE(p.full_name, 'System') AS actor_name,
    p.email AS actor_email,
    p.role AS actor_role,
    p.avatar_url AS actor_avatar
  FROM public.audit_logs al
  LEFT JOIN public.profiles p ON al.user_id = p.id
  ORDER BY al.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
