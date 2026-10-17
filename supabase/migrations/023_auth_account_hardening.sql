-- ==============================================================================
-- FinLITE Migration 023: Auth Account Hardening
--
-- Fixes the account-takeover class of problems around mixed Google OAuth and
-- email/password sign-in:
--
--   1. Email "verification" was fake. Migration 015 force-confirmed every new
--      auth.users row, so Supabase treated attacker-registered, never-verified
--      accounts as verified. That defeats Supabase's own pre-hijacking defence.
--   2. sync_auth_user_credentials() was callable by `anon` and could overwrite
--      the password (and confirm the email) of any account not yet approved.
--   3. A passwordless (Google-only) account could gain a password through the
--      public "forgot password" recovery flow.
--   4. A Google sign-in could silently attach itself to an existing password
--      account that has the same email.
--   5. Several triggers linked profiles to auth users by email without checking
--      that the email was ever verified.
--
-- Deployment order: run this migration in the Supabase SQL editor FIRST, then
-- deploy the application code. The new code reads the table and column added
-- here and will error if they do not exist yet.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1. Per-user security state (consent windows and link records)
--    Service-role only: RLS is on and there are deliberately no policies.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_security_state (
  auth_user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_enroll_until TIMESTAMPTZ,   -- short window opened by the authenticated "set password" API
  google_link_until     TIMESTAMPTZ,   -- short window opened after the user proves their password
  password_set_at       TIMESTAMPTZ,
  google_linked_at      TIMESTAMPTZ,   -- when Google became an approved sign-in method
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.auth_security_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.auth_security_state FROM anon, authenticated;

-- Grandfather existing Google identities. Accounts that already have a Google
-- identity cannot be told apart from consented links, so they keep working.
-- (See the "review" query at the bottom to audit accounts that have both.)
INSERT INTO public.auth_security_state (auth_user_id, google_linked_at)
SELECT i.user_id, COALESCE(i.created_at, NOW())
FROM auth.identities i
WHERE i.provider = 'google'
ON CONFLICT (auth_user_id) DO UPDATE
  SET google_linked_at = COALESCE(public.auth_security_state.google_linked_at, EXCLUDED.google_linked_at);


-- ------------------------------------------------------------------------------
-- 2. registration_requests.email_verified_at
--    Set only when the applicant clicks the verification link we email them.
-- ------------------------------------------------------------------------------
ALTER TABLE public.registration_requests
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Google applicants: Google already verified the mailbox.
UPDATE public.registration_requests
SET email_verified_at = COALESCE(email_verified_at, created_at)
WHERE auth_provider = 'google';

-- Already-approved email applicants were vetted by an admin before this change.
UPDATE public.registration_requests
SET email_verified_at = COALESCE(email_verified_at, reviewed_at, created_at)
WHERE auth_provider = 'email' AND status = 'approved';

-- NOTE: legacy *pending* email requests are intentionally left NULL. Their
-- emails were force-confirmed by migration 015, which proves nothing. The admin
-- console shows them as "Email not verified" and approval is blocked until the
-- applicant verifies, or you explicitly vouch for one of them, e.g.:
--   UPDATE public.registration_requests SET email_verified_at = NOW()
--   WHERE email = 'someone@gmail.com';


-- ------------------------------------------------------------------------------
-- 3. Stop force-confirming emails
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_auto_confirm_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.fn_auto_confirm_auth_user();


-- ------------------------------------------------------------------------------
-- 4. Remove the anon-callable credential-overwrite RPC
--    The app no longer calls it; it was an unauthenticated password reset for
--    any email whose profile was not yet approved.
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.sync_auth_user_credentials(TEXT, TEXT, TEXT, TEXT, TEXT);


-- ------------------------------------------------------------------------------
-- 5. Approval must not confirm an email on the user's behalf
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_user_on_approval(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT := lower(trim(p_email));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can link users on approval.';
  END IF;

  -- Link only; the email must already have been verified by its owner.
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
    AND email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET auth_user_id = v_user_id
    WHERE lower(email) = v_clean_email
      AND (auth_user_id IS NULL OR auth_user_id <> v_user_id);
  END IF;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_user_on_approval(TEXT) TO authenticated;


-- ------------------------------------------------------------------------------
-- 6. Profile <-> auth.users linking by email now requires a VERIFIED email
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_link_and_confirm_profile_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_real_auth_id UUID;
BEGIN
  SELECT id INTO v_real_auth_id
  FROM auth.users
  WHERE lower(email) = lower(NEW.email)
    AND email_confirmed_at IS NOT NULL
  LIMIT 1;

  IF v_real_auth_id IS NOT NULL THEN
    NEW.auth_user_id := v_real_auth_id;

    -- Keep the JWT metadata used by the middleware in sync. Email confirmation
    -- is no longer touched here.
    IF NEW.status = 'approved' THEN
      UPDATE auth.users
      SET
        raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
          'role', NEW.role::text,
          'status', 'approved'
        ),
        updated_at = NOW()
      WHERE id = v_real_auth_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_profile_on_auth_user_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only an unlinked profile may be claimed, and only by a verified email.
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles
    SET
      auth_user_id = NEW.id,
      auth_provider = COALESCE(auth_provider, NEW.raw_app_meta_data->>'provider', 'email'),
      updated_at = NOW()
    WHERE lower(email) = lower(NEW.email)
      AND auth_user_id IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_on_auth_user_event ON auth.users;
CREATE TRIGGER trg_sync_profile_on_auth_user_event
  AFTER INSERT OR UPDATE OF email, email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_profile_on_auth_user_event();

CREATE OR REPLACE FUNCTION public.link_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_confirmed BOOLEAN := FALSE;
  v_profile RECORD;
BEGIN
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  SELECT (email_confirmed_at IS NOT NULL) INTO v_confirmed
  FROM auth.users WHERE id = v_auth_id;

  SELECT id, role, status, email, first_name, last_name, full_name, avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE auth_user_id = v_auth_id
  LIMIT 1;

  -- Link by email only when the caller's email is verified and the profile is unlinked.
  IF v_profile.id IS NULL AND v_email <> '' AND COALESCE(v_confirmed, FALSE) THEN
    UPDATE public.profiles
    SET
      auth_user_id = v_auth_id,
      updated_at = NOW()
    WHERE lower(email) = v_email
      AND auth_user_id IS NULL
    RETURNING id, role, status, email, first_name, last_name, full_name, avatar_url
    INTO v_profile;
  END IF;

  IF v_profile.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'profile_id', v_profile.id,
      'role', v_profile.role,
      'status', v_profile.status,
      'email', v_profile.email,
      'full_name', COALESCE(v_profile.full_name, trim(v_profile.first_name || ' ' || COALESCE(v_profile.last_name, ''))),
      'avatar_url', v_profile.avatar_url,
      'linked', true
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'error', 'Profile not found for authenticated user',
    'linked', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_current_user_profile() TO authenticated;


-- ------------------------------------------------------------------------------
-- 7. Auth-method lookup used by the API (service role only)
--    The auth schema is the single source of truth for "does this account have
--    a password" and "is this email verified".
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finlite_auth_methods(
  p_user_id UUID DEFAULT NULL,
  p_email   TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u auth.users%ROWTYPE;
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO u FROM auth.users WHERE id = p_user_id;
  ELSIF p_email IS NOT NULL THEN
    SELECT * INTO u FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  END IF;

  IF u.id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'user_id', u.id,
    'email', u.email,
    'has_password', COALESCE(u.encrypted_password, '') <> '',
    'email_confirmed', u.email_confirmed_at IS NOT NULL,
    'providers', COALESCE(
      (SELECT jsonb_agg(provider) FROM auth.identities WHERE user_id = u.id),
      '[]'::jsonb
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finlite_auth_methods(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finlite_auth_methods(UUID, TEXT) TO service_role;


-- ------------------------------------------------------------------------------
-- 8. Hard enforcement at the auth layer
--    These cannot be bypassed by calling Supabase's public auth endpoints
--    directly (e.g. POST /auth/v1/recover from a browser console).
--    Each is wrapped so the migration still completes if your database role is
--    not allowed to create triggers on a given auth table; in that case the
--    application-level checks in the OAuth callback and password API still
--    apply, and a WARNING tells you which guard was not installed.
-- ------------------------------------------------------------------------------

-- 8a. A passwordless account can only gain a password while the authenticated
--     settings API has opened an enrollment window for that exact user.
--     This is what stops "forgot password" from adding a password to a
--     Google-only account.
CREATE OR REPLACE FUNCTION public.fn_guard_password_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF COALESCE(OLD.encrypted_password, '') = '' AND COALESCE(NEW.encrypted_password, '') <> '' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.auth_security_state s
      WHERE s.auth_user_id = NEW.id AND s.password_enroll_until > NOW()
    ) THEN
      RAISE EXCEPTION 'finlite_password_enrollment_requires_authenticated_settings'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_guard_password_enrollment ON auth.users;
  CREATE TRIGGER trg_guard_password_enrollment
    BEFORE UPDATE OF encrypted_password ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_guard_password_enrollment();
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'trg_guard_password_enrollment NOT installed (insufficient privilege on auth.users)';
END $$;

-- 8b. An OAuth identity cannot be attached to an existing, verified,
--     password-protected account unless the owner opened a link window by
--     proving their password. (An unverified account is deliberately not
--     blocked: Supabase itself neutralises unverified accounts when the real
--     owner signs in with Google, which is the pre-hijacking defence.)
CREATE OR REPLACE FUNCTION public.fn_guard_oauth_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.provider <> 'email' THEN
    IF EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = NEW.user_id
        AND u.email_confirmed_at IS NOT NULL
        AND COALESCE(u.encrypted_password, '') <> ''
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.auth_security_state s
      WHERE s.auth_user_id = NEW.user_id AND s.google_link_until > NOW()
    ) THEN
      RAISE EXCEPTION 'finlite_oauth_link_requires_password_proof'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS trg_guard_oauth_link ON auth.identities;
  CREATE TRIGGER trg_guard_oauth_link
    BEFORE INSERT ON auth.identities
    FOR EACH ROW
    WHEN (NEW.provider <> 'email')
    EXECUTE FUNCTION public.fn_guard_oauth_link();
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'trg_guard_oauth_link NOT installed (insufficient privilege on auth.identities)';
END $$;


-- ------------------------------------------------------------------------------
-- 9. Review query (read-only): accounts that have BOTH a password and Google.
--    Anything here that you do not recognise as a deliberate link is worth a look.
--
--   SELECT u.email, u.created_at, i.created_at AS google_identity_created
--   FROM auth.users u
--   JOIN auth.identities i ON i.user_id = u.id AND i.provider = 'google'
--   WHERE COALESCE(u.encrypted_password, '') <> '';
-- ------------------------------------------------------------------------------
