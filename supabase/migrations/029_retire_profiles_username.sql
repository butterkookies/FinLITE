-- ==============================================================================
-- FinLITE Database Migration 029: Retire Profiles Username Column
-- 
-- Context:
-- Authentication in FinLITE has fully transitioned to verified Gmail addresses
-- and Google OAuth 2.0. The legacy 'username' column in 'profiles' is retired
-- and removed from the active application codebase.
-- ==============================================================================

-- 1. Drop username from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS username;

-- 2. Drop any unique constraint or index on username if existing
DROP INDEX IF EXISTS public.profiles_username_key;
DROP INDEX IF EXISTS public.idx_profiles_username;
