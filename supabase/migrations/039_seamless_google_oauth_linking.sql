-- ==============================================================================
-- Migration 039: Seamless Google OAuth Linking
-- ==============================================================================
-- Allow Google identities to attach automatically to existing accounts with
-- matching verified emails. Google cryptographically verifies email ownership
-- for @gmail.com and Google Workspace accounts (email_verified: true).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.fn_guard_oauth_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Google OAuth linking is permitted seamlessly.
  -- Record google_linked_at in auth_security_state so the security status is updated.
  IF NEW.provider = 'google' THEN
    INSERT INTO public.auth_security_state (auth_user_id, google_linked_at, updated_at)
    VALUES (NEW.user_id, NOW(), NOW())
    ON CONFLICT (auth_user_id)
    DO UPDATE SET
      google_linked_at = COALESCE(public.auth_security_state.google_linked_at, NOW()),
      updated_at = NOW();
    RETURN NEW;
  END IF;

  -- 2. Guard for any other non-email third-party providers (if added in the future):
  IF NEW.provider NOT IN ('email', 'google') THEN
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

-- Ensure trigger is installed
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
