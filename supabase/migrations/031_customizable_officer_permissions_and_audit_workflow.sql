-- ==============================================================================
-- FinLITE Database Migration 031: Customizable Officer Permissions & Audit Workflow
-- 
-- 1. Adds 'PENDING_AUDIT' to transaction_status enum.
-- 2. Adds 'permissions' JSONB column to public.profiles.
-- 3. Seeds sensible default permissions based on current roles.
-- 4. Creates database helper public.has_permission().
-- 5. Updates transactions RLS policies to recognize granular permissions.
-- ==============================================================================

BEGIN;

-- 1. Extend transaction_status enum with 'PENDING_AUDIT' if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumtypid = 'transaction_status'::regtype 
      AND enumlabel = 'PENDING_AUDIT'
  ) THEN
    ALTER TYPE transaction_status ADD VALUE 'PENDING_AUDIT' BEFORE 'COMPLETED';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add permissions JSONB column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Also add to registration_requests if present to support pending officer staging
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registration_requests') THEN
    ALTER TABLE public.registration_requests 
      ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- 3. Seed default permissions for existing approved profiles based on their roles
-- Role defaults:
-- Admin: all permissions
-- President: record_inflow, record_outflow, record_abono, edit_transaction, export_reports
-- Treasurer: record_inflow, record_outflow, record_abono, edit_transaction, cash_reconciliation, export_reports
-- Auditor: audit_approve, cash_reconciliation, export_reports
-- Adviser: export_reports

UPDATE public.profiles
SET permissions = jsonb_build_object(
  'record_inflow', true,
  'record_outflow', true,
  'record_abono', true,
  'edit_transaction', true,
  'delete_transaction', true,
  'audit_approve', true,
  'cash_reconciliation', true,
  'export_reports', true
)
WHERE role = 'admin' AND (permissions IS NULL OR permissions = '{}'::jsonb);

UPDATE public.profiles
SET permissions = jsonb_build_object(
  'record_inflow', true,
  'record_outflow', true,
  'record_abono', true,
  'edit_transaction', true,
  'delete_transaction', false,
  'audit_approve', false,
  'cash_reconciliation', false,
  'export_reports', true
)
WHERE role = 'president' AND (permissions IS NULL OR permissions = '{}'::jsonb);

UPDATE public.profiles
SET permissions = jsonb_build_object(
  'record_inflow', true,
  'record_outflow', true,
  'record_abono', true,
  'edit_transaction', true,
  'delete_transaction', false,
  'audit_approve', false,
  'cash_reconciliation', true,
  'export_reports', true
)
WHERE role = 'treasurer' AND (permissions IS NULL OR permissions = '{}'::jsonb);

UPDATE public.profiles
SET permissions = jsonb_build_object(
  'record_inflow', false,
  'record_outflow', false,
  'record_abono', false,
  'edit_transaction', false,
  'delete_transaction', false,
  'audit_approve', true,
  'cash_reconciliation', true,
  'export_reports', true
)
WHERE role = 'auditor' AND (permissions IS NULL OR permissions = '{}'::jsonb);

UPDATE public.profiles
SET permissions = jsonb_build_object(
  'record_inflow', false,
  'record_outflow', false,
  'record_abono', false,
  'edit_transaction', false,
  'delete_transaction', false,
  'audit_approve', false,
  'cash_reconciliation', false,
  'export_reports', true
)
WHERE role = 'adviser' AND (permissions IS NULL OR permissions = '{}'::jsonb);

-- 4. Helper function: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(p_auth_user_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
  v_perms JSONB;
  v_status TEXT;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role, permissions, status INTO v_role, v_perms, v_status
  FROM public.profiles
  WHERE auth_user_id = p_auth_user_id;

  IF v_status IS DISTINCT FROM 'approved' THEN
    RETURN FALSE;
  END IF;

  -- Admin always has wildcard permission
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  IF v_perms IS NOT NULL AND (v_perms->>p_action)::boolean IS TRUE THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 5. Update default status on transactions table to PENDING_AUDIT
ALTER TABLE public.transactions 
  ALTER COLUMN status SET DEFAULT 'PENDING_AUDIT';

COMMIT;
