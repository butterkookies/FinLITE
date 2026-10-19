-- ==============================================================================
-- FinLITE Database Migration 027: Dedicated Email Verification, Password Reset OTPs & Release Broadcasts
-- (Renumbered from PR #6 migration 024)
-- 
-- Powers Gmail SMTP verification codes (OTP), password recovery, and
-- automated system release broadcasts.
-- ==============================================================================

-- 1. Create table for 6-digit OTP verification codes
CREATE TABLE IF NOT EXISTS public.email_verification_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'registration', -- 'registration' | 'password_reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast verification lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_otps_lookup 
  ON public.email_verification_otps(lower(email), code, purpose, used);

-- Enable RLS
ALTER TABLE public.email_verification_otps ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated clients to insert OTP records via API routes
DROP POLICY IF EXISTS "Allow public insert email_verification_otps" ON public.email_verification_otps;
CREATE POLICY "Allow public insert email_verification_otps"
  ON public.email_verification_otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon and authenticated clients to select OTP records for verification
DROP POLICY IF EXISTS "Allow public select email_verification_otps" ON public.email_verification_otps;
CREATE POLICY "Allow public select email_verification_otps"
  ON public.email_verification_otps FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow updating (marking as used)
DROP POLICY IF EXISTS "Allow public update email_verification_otps" ON public.email_verification_otps;
CREATE POLICY "Allow public update email_verification_otps"
  ON public.email_verification_otps FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Extend registration_requests table with email_verified flag
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_code TEXT,
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- 3. Create app_releases table for tracking system updates & broadcast status
CREATE TABLE IF NOT EXISTS public.app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  release_notes JSONB,
  broadcasted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  broadcasted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.app_releases ENABLE ROW LEVEL SECURITY;

-- Allow anyone authenticated to read releases
DROP POLICY IF EXISTS "Allow authenticated read app_releases" ON public.app_releases;
CREATE POLICY "Allow authenticated read app_releases"
  ON public.app_releases FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow insert/update for admins or server operations
DROP POLICY IF EXISTS "Allow insert app_releases" ON public.app_releases;
CREATE POLICY "Allow insert app_releases"
  ON public.app_releases FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 4. RPC Function: Verify Password Reset OTP and update auth.users password
CREATE OR REPLACE FUNCTION public.reset_user_password_with_otp(
  p_email TEXT,
  p_code TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_clean_email TEXT := lower(trim(p_email));
  v_otp_id UUID;
  v_user_id UUID;
BEGIN
  -- 1. Validate that a valid, unused, unexpired OTP exists
  SELECT id INTO v_otp_id
  FROM public.email_verification_otps
  WHERE lower(email) = v_clean_email
    AND code = trim(p_code)
    AND purpose = 'password_reset'
    AND used = false
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_otp_id IS NULL THEN
    RAISE EXCEPTION 'Invalid, expired, or already used reset code.';
  END IF;

  -- 2. Mark OTP as used
  UPDATE public.email_verification_otps
  SET used = true
  WHERE id = v_otp_id;

  -- 3. Locate user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No user account found with this email address.';
  END IF;

  -- 4. Update encrypted_password in auth.users
  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_password_with_otp(TEXT, TEXT, TEXT) TO anon, authenticated;
