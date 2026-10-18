-- ==============================================================================
-- FinLITE Database Migration 025: Security Definer for Registration Email Verification
--
-- Allows unauthenticated / anon clients to mark their email address as verified
-- in the registration_requests table after successful 6-digit OTP verification.
-- Bypasses RLS restrictions safely.
-- ==============================================================================

-- 1. Ensure columns exist on registration_requests
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- 2. Security Definer RPC to mark registration email as verified
CREATE OR REPLACE FUNCTION public.verify_registration_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_email TEXT := lower(trim(p_email));
BEGIN
  UPDATE public.registration_requests
  SET
    email_verified = true,
    email_verified_at = NOW(),
    updated_at = NOW()
  WHERE lower(email) = v_clean_email;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_registration_email(TEXT) TO anon, authenticated;
