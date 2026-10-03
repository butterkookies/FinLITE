-- ==============================================================================
-- Migration 008: Supabase Storage for Receipts, Categories & Column Sync
-- ==============================================================================

-- 1. Create Public Storage Bucket for Receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Storage Objects RLS Policies for Receipts Bucket
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Public can view receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Authenticated users can update their receipts" ON storage.objects;
CREATE POLICY "Authenticated users can update their receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Admins and uploaders can delete receipts" ON storage.objects;
CREATE POLICY "Admins and uploaders can delete receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'receipts');

-- 3. Add category_name to transactions table if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'category_name'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN category_name TEXT;
  END IF;
END $$;

-- 4. Clean up any invalid browser blob: URLs in transactions
UPDATE public.transactions
SET receipt_url = NULL
WHERE receipt_url LIKE 'blob:%';

-- 5. Seed Official PDM LITE Categories
INSERT INTO public.categories (id, name, type, description) VALUES
  ('b1111111-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tournament & E-Sports Registration Fees', 'INFLOW', 'Registration fees collected from Mobile Legends / Valorant / CS participants'),
  ('b2222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Merchandise Sales (Batch Pre-Order)', 'INFLOW', 'LITE lanyards, shirts, and stickers batch sales with 100% upfront payment'),
  ('b3333333-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Club Week Booth Space & Commission', 'INFLOW', 'Institutional Club Week food/drinks booth space rentals and sales commissions'),
  ('b4444444-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Donations, Sponsorships & Seed Rollover', 'INFLOW', 'Voluntary donations, external event sponsorships, and beginning term seed rollover'),
  ('b5555555-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other Verified Inflow', 'INFLOW', 'Miscellaneous verified organization collections and revenues'),
  ('b6666666-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Supplies & Materials', 'OUTFLOW', 'Tarpaulins, poster boards, ribbons, laminating sheets, and office materials'),
  ('b7777777-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Food & Committee Meals', 'OUTFLOW', 'Packed meals and refreshments for volunteer marshals, committee, and working teams'),
  ('b8888888-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Tournament Cash Prizes', 'OUTFLOW', 'Cash prizes and awards officially disbursed to competition winners'),
  ('b9999999-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Honoraria & Guest Tokens', 'OUTFLOW', 'Tokens of appreciation and honoraria for guest speakers, resource persons, and judges'),
  ('baaaaaaa-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Declared Cash Shortage Discrepancy', 'OUTFLOW', 'Documented and approved petty cash discrepancies from loose coins during peak booth rush')
ON CONFLICT DO NOTHING;
