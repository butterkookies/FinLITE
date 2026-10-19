-- ==============================================================================
-- FinLITE Database Migration 028: Security Definer for Registration Email Verification
-- (Renumbered from PR #6 migration 025)
--
-- Validates a 6-digit registration OTP against email_verification_otps and marks
-- the applicant's email address as verified in the registration_requests table.
-- Restricted to server-side service_role access only.
-- ==============================================================================

-- 1. Ensure columns exist on registration_requests
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Drop legacy unvalidated 1-parameter signature
DROP FUNCTION IF EXISTS public.verify_registration_email(TEXT);

-- 2. Security Definer RPC to validate OTP and mark registration email as verified
CREATE OR REPLACE FUNCTION public.verify_registration_email(
  p_email TEXT,
  p_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_email TEXT := lower(trim(p_email));
  v_clean_code TEXT := trim(p_code);
  v_otp_id UUID;
BEGIN
  -- 1. Validate that an active, unused, unexpired registration OTP exists
  SELECT id INTO v_otp_id
  FROM public.email_verification_otps
  WHERE lower(email) = v_clean_email
    AND code = v_clean_code
    AND purpose = 'registration'
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already used verification code.';
  END IF;

  -- 2. Mark the OTP as used to prevent replay attacks
  UPDATE public.email_verification_otps
  SET used = true
  WHERE id = v_otp_id;

  -- 3. Mark the registration request as email-verified
  UPDATE public.registration_requests
  SET
    email_verified = true,
    email_verified_at = NOW(),
    updated_at = NOW()
  WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No registration request found for this email address.';
  END IF;

  RETURN true;
END;
$$;

-- Security Hardening: Revoke execution from PUBLIC, anon, and authenticated.
-- Only server-side service_role callers can invoke registration email verification.
REVOKE EXECUTE ON FUNCTION public.verify_registration_email(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_registration_email(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_registration_email(TEXT, TEXT) TO service_role;
