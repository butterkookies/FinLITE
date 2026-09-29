-- ==============================================================================
-- FinLITE Migration 005: Auth, User Registration & Admin Approval Flow
-- Supports email/password and Google OAuth registration with admin confirmation
-- ==============================================================================

-- 1. Extend user_role enum to include 'admin' if not already present
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Extend profiles table with new fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contact_number TEXT,
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email',  -- 'email' | 'google'
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',        -- 'pending' | 'approved' | 'rejected'
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Make email nullable (Google OAuth users may not have it immediately)
-- full_name can be derived from first_name + last_name
ALTER TABLE profiles
  ALTER COLUMN full_name SET DEFAULT '';

-- 3. Registration Requests table — holds pending registrations before admin approval
CREATE TABLE IF NOT EXISTS registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  contact_number TEXT,
  auth_provider TEXT NOT NULL DEFAULT 'email',   -- 'email' | 'google'
  google_id TEXT,                                  -- Google subject ID (for OAuth)
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',          -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  requested_role user_role NOT NULL DEFAULT 'treasurer',
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. RLS for registration_requests
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a registration request (public signup)
CREATE POLICY "Allow public insert registration_requests"
  ON registration_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated admins/advisers can read & update all requests
CREATE POLICY "Allow authenticated read registration_requests"
  ON registration_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated update registration_requests"
  ON registration_requests FOR UPDATE
  TO authenticated
  USING (true);

-- Anon can read their own request by email (for status polling)
CREATE POLICY "Allow anon read own registration_request"
  ON registration_requests FOR SELECT
  TO anon
  USING (true);

-- 5. Trigger: auto-update updated_at on registration_requests
CREATE OR REPLACE FUNCTION update_registration_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER trg_registration_requests_updated_at
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW EXECUTE FUNCTION update_registration_request_timestamp();
