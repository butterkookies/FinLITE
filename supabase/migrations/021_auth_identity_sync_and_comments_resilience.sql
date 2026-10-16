-- ==============================================================================
-- FinLITE Database Migration 021: Auth Identity Sync & Comments RLS Resilience
-- Resolves:
-- 1. Dual-identity desync between auth.users and public.profiles across Google & Email sign-ins
-- 2. "new row violates row-level security policy for table 'transaction_comments'" error
-- 3. Automatic self-healing trigger on auth.users events
-- 4. RPC for on-demand caller profile linking
-- ==============================================================================

-- 1. Resilient Row Level Security (RLS) on transaction_comments
ALTER TABLE public.transaction_comments ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Authenticated members can read comments
DROP POLICY IF EXISTS "Authenticated officers can read transaction comments" ON public.transaction_comments;
CREATE POLICY "Authenticated officers can read transaction comments"
  ON public.transaction_comments FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy: Any authenticated officer can insert remarks
DROP POLICY IF EXISTS "Authenticated officers can insert transaction comments" ON public.transaction_comments;
CREATE POLICY "Authenticated officers can insert transaction comments"
  ON public.transaction_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE policy: Author (by auth_user_id or matching JWT email) or Admin can update
DROP POLICY IF EXISTS "Authors or admins can update transaction comments" ON public.transaction_comments;
CREATE POLICY "Authors or admins can update transaction comments"
  ON public.transaction_comments FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR user_id IN (SELECT id FROM public.profiles WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR public.is_admin()
  );

-- DELETE policy: Author (by auth_user_id or matching JWT email) or Admin can delete
DROP POLICY IF EXISTS "Authors or admins can delete transaction comments" ON public.transaction_comments;
CREATE POLICY "Authors or admins can delete transaction comments"
  ON public.transaction_comments FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR user_id IN (SELECT id FROM public.profiles WHERE lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
    OR public.is_admin()
  );

-- 2. Automatic Reverse Sync Trigger: When a user registers/logs in via auth.users,
-- stamp their auth.users UUID directly onto public.profiles matching their email
CREATE OR REPLACE FUNCTION public.fn_sync_profile_on_auth_user_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles
  SET
    auth_user_id = NEW.id,
    auth_provider = COALESCE(auth_provider, NEW.raw_app_meta_data->>'provider', 'email'),
    updated_at = NOW()
  WHERE lower(email) = lower(NEW.email)
    AND (auth_user_id IS NULL OR auth_user_id <> NEW.id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_on_auth_user_event ON auth.users;
CREATE TRIGGER trg_sync_profile_on_auth_user_event
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_profile_on_auth_user_event();

-- 3. RPC Function for seamless on-demand self-healing from client or API routes
CREATE OR REPLACE FUNCTION public.link_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID := auth.uid();
  v_email TEXT := lower(COALESCE(auth.jwt() ->> 'email', ''));
  v_profile RECORD;
BEGIN
  IF v_auth_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthenticated');
  END IF;

  -- 1. Try finding existing profile by auth_user_id
  SELECT id, role, status, email, first_name, last_name, full_name, avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE auth_user_id = v_auth_id
  LIMIT 1;

  -- 2. If not found by auth_user_id, link via matching email
  IF v_profile.id IS NULL AND v_email <> '' THEN
    UPDATE public.profiles
    SET
      auth_user_id = v_auth_id,
      updated_at = NOW()
    WHERE lower(email) = v_email
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

-- 4. Immediate Backfill: Link all existing unlinked profiles where emails match
UPDATE public.profiles p
SET
  auth_user_id = u.id,
  updated_at = NOW()
FROM auth.users u
WHERE lower(p.email) = lower(u.email)
  AND (p.auth_user_id IS NULL OR p.auth_user_id <> u.id);
