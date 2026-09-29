-- ==============================================================================
-- FinLITE Migration 006: Admin Setup, Permissions & Profiles RLS Policies
-- Grants admin privileges to geronimoandreijohn.pdm@gmail.com / geronimoandreiojohn.pdm@gmail.com
-- ==============================================================================

-- 1. Ensure user_role enum contains 'admin'
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. Add Profiles Table RLS Policies for Insert & Update
-- Drop existing restrictive policies if needed to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON profiles;

CREATE POLICY "Allow public read profiles"
  ON profiles FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Allow public insert profiles"
  ON profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Allow public update profiles"
  ON profiles FOR UPDATE
  TO authenticated, anon
  USING (true);

-- 3. Ensure registration_requests RLS permits admin review & status updates
DROP POLICY IF EXISTS "Allow authenticated update registration_requests" ON registration_requests;
DROP POLICY IF EXISTS "Allow public update registration_requests" ON registration_requests;

CREATE POLICY "Allow public update registration_requests"
  ON registration_requests FOR UPDATE
  TO authenticated, anon
  USING (true);

-- 4. Auto-Promote Super Admin Account in profiles
-- Andrei John Geronimo (geronimoandreijohn.pdm@gmail.com)
INSERT INTO profiles (
  full_name,
  first_name,
  last_name,
  username,
  email,
  role,
  status,
  auth_provider,
  approved_at
)
VALUES 
  (
    'Andrei John Geronimo',
    'Andrei John',
    'Geronimo',
    'andrei_admin',
    'geronimoandreijohn.pdm@gmail.com',
    'admin',
    'approved',
    'google',
    NOW()
  )
ON CONFLICT (email) DO UPDATE
SET 
  role = 'admin',
  status = 'approved',
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  approved_at = NOW();

-- 5. Auto-Approve any pending registration requests for Super Admin
UPDATE registration_requests
SET 
  status = 'approved',
  requested_role = 'admin',
  reviewed_at = NOW()
WHERE email = 'geronimoandreijohn.pdm@gmail.com';
