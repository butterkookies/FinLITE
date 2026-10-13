-- ==============================================================================
-- FinLITE Migration 015: Permanent Auth Auto-Confirmation & Credential Sync
-- Eliminates "Invalid login credentials" caused by unconfirmed emails or OAuth
-- pre-existing accounts when SUPABASE_SERVICE_ROLE_KEY is not configured.
-- ==============================================================================

-- 1. Ensure pgcrypto extension is available for bcrypt password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Trigger Function: Auto-confirm every new user inserted into auth.users
CREATE OR REPLACE FUNCTION public.fn_auto_confirm_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_auth_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_auth_user
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_confirm_auth_user();

-- 3. RPC Function: Sync password, confirm email, and link identity on registration
-- Safely guarded so it cannot overwrite credentials of an already-approved user.
CREATE OR REPLACE FUNCTION public.sync_auth_user_credentials(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT DEFAULT '',
  p_last_name TEXT DEFAULT '',
  p_username TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_clean_email TEXT := lower(trim(p_email));
  v_full_name TEXT := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));
BEGIN
  -- Security Guard: Do not allow overwriting credentials if account is already approved in profiles
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = v_clean_email
      AND status = 'approved'
  ) THEN
    RAISE EXCEPTION 'Account is already approved and active.';
  END IF;

  -- Locate user in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Update password hash, confirm email, and sync user metadata
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'first_name', p_first_name,
        'last_name', p_last_name,
        'full_name', v_full_name,
        'username', p_username
      ),
      updated_at = NOW()
    WHERE id = v_user_id;

    -- Ensure an 'email' provider identity exists in auth.identities so password login works
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    SELECT
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object(
        'sub', v_user_id::text,
        'email', v_clean_email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_user_id::text,
      NOW(),
      NOW(),
      NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = v_user_id AND provider = 'email'
    );
  END IF;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_auth_user_credentials(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4. RPC & Trigger Function: Confirm user email and link true auth_user_id upon Admin Approval
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
    RAISE EXCEPTION 'Unauthorized: Only admins can confirm users on approval.';
  END IF;

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = v_clean_email
  LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_user_id;

    UPDATE public.profiles
    SET auth_user_id = v_user_id
    WHERE lower(email) = v_clean_email
      AND (auth_user_id IS NULL OR auth_user_id <> v_user_id);
  END IF;

  RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_user_on_approval(TEXT) TO authenticated;

-- 5. Profile Trigger: Automatically resolve true auth.users.id and confirm email when profile is approved
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
  LIMIT 1;

  IF v_real_auth_id IS NOT NULL THEN
    NEW.auth_user_id := v_real_auth_id;

    IF NEW.status = 'approved' THEN
      UPDATE auth.users
      SET
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
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

DROP TRIGGER IF EXISTS trg_link_and_confirm_profile_auth ON public.profiles;
CREATE TRIGGER trg_link_and_confirm_profile_auth
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_link_and_confirm_profile_auth();

-- ==============================================================================
-- 6. Immediate Backfill: Confirm all existing users & repair geronimojoan002@gmail.com
-- ==============================================================================

-- Confirm all existing unconfirmed users in auth.users
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Ensure geronimojoan002@gmail.com has the exact password ('bsit31Aweb') and email identity
DO $$
DECLARE
  v_target_id UUID;
BEGIN
  SELECT id INTO v_target_id
  FROM auth.users
  WHERE lower(email) = 'geronimojoan002@gmail.com'
  LIMIT 1;

  IF v_target_id IS NOT NULL THEN
    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt('bsit31Aweb', extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE id = v_target_id;

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    )
    SELECT
      gen_random_uuid(),
      v_target_id,
      jsonb_build_object(
        'sub', v_target_id::text,
        'email', 'geronimojoan002@gmail.com',
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      v_target_id::text,
      NOW(), NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.identities
      WHERE user_id = v_target_id AND provider = 'email'
    );
  END IF;
END $$;

-- Re-link all existing profiles to their true auth.users UUID
UPDATE public.profiles p
SET auth_user_id = u.id
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND (p.auth_user_id IS NULL OR p.auth_user_id <> u.id);
