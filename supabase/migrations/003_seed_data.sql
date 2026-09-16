-- ==============================================================================
-- FinLITE Seed Data: Realistic AY 2025–2026 Academic Records
-- ==============================================================================

-- 1. Insert Initial Profiles (LITE Executive Board & Advisers)
INSERT INTO profiles (id, full_name, email, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Andrei John P. Geronimo', 'treasurer@pdm.edu.ph', 'treasurer'),
  ('22222222-2222-2222-2222-222222222222', 'Christian Rey C. Kasilag', 'auditor@pdm.edu.ph', 'auditor'),
  ('33333333-3333-3333-3333-333333333333', 'Emanuel Malbarosa', 'president@pdm.edu.ph', 'president'),
  ('44444444-4444-4444-4444-444444444444', 'Ms. Kimberly Dawn Jatulan', 'adviser.jatulan@pdm.edu.ph', 'adviser'),
  ('55555555-5555-5555-5555-555555555555', 'Ms. Krizia Mae Genovia', 'adviser.genovia@pdm.edu.ph', 'adviser')
ON CONFLICT (email) DO NOTHING;

-- 2. Insert Standard Categories
INSERT INTO categories (id, name, type, description) VALUES
  ('a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Booth Sales', 'INFLOW', 'Sales from Club Week food, drinks, and merchandise booth'),
  ('a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'E-Sports Registrations', 'INFLOW', 'Registration fees collected from Mobile Legends / Valorant participants'),
  ('a3333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Membership Fees', 'INFLOW', 'LITE membership collection dues'),
  ('a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Supplies & Materials', 'OUTFLOW', 'Tarpaulins, poster boards, ribbons, laminating sheets'),
  ('a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Food & Refreshments', 'OUTFLOW', 'Meals and tokens for event committee, speakers, and judges'),
  ('a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tournament Prizes', 'OUTFLOW', 'Cash prizes and certificates awarded to tournament winners'),
  ('a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Administrative / Shortage', 'OUTFLOW', 'Approved petty cash discrepancies and document printing')
ON CONFLICT DO NOTHING;

-- 3. Insert Historical Sample Transactions
INSERT INTO transactions (title, description, amount, type, payment_method, category_id, logged_by, transaction_date, is_reimbursement, reimbursement_recipient, status, event_name) VALUES
  ('Club Week Booth Revenue Day 1', 'Gross sales from snacks and drinks booth', 8500.00, 'INFLOW', 'CASH', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', FALSE, NULL, 'COMPLETED', 'Club Week 2026'),
  ('Club Week Booth Revenue Day 2', 'Snacks and custom LITE stickers sales', 6200.00, 'INFLOW', 'CASH', 'a1111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '13 days', FALSE, NULL, 'COMPLETED', 'Club Week 2026'),
  ('E-Sports MLBB Tournament Registration', '16 teams registered @ ₱300 per team', 4800.00, 'INFLOW', 'GCASH', 'a2222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '10 days', FALSE, NULL, 'COMPLETED', 'E-Sports Cup 2026'),
  ('Booth Setup Tarpaulin & Décor', 'Official event backdrop printed at Marilao Commercial Center', 1450.00, 'OUTFLOW', 'CASH', 'a4444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '15 days', FALSE, NULL, 'COMPLETED', 'Club Week 2026'),
  ('Committee Working Lunch Day 1', 'Packed meals for volunteer student marshals (Jollibee)', 2100.00, 'OUTFLOW', 'CASH', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '14 days', FALSE, NULL, 'COMPLETED', 'Club Week 2026'),
  ('E-Sports Champion Cash Prize', 'Grand winner 1st place cash prize payout', 3000.00, 'OUTFLOW', 'CASH', 'a6666666-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '9 days', FALSE, NULL, 'COMPLETED', 'E-Sports Cup 2026'),
  ('Judge Tokens & Certificates (Adviser Advance)', 'Out-of-pocket advance for guest speaker tokens', 1250.00, 'OUTFLOW', 'CASH', 'a5555555-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', CURRENT_DATE - INTERVAL '7 days', TRUE, 'Ms. Kimberly Dawn Jatulan', 'PENDING_REIMBURSEMENT', 'Club Week 2026'),
  ('Declared Cash Box Shortage', 'Approved minor discrepancy from loose coins during peak booth rush', 161.00, 'OUTFLOW', 'CASH', 'a7777777-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE - INTERVAL '5 days', FALSE, NULL, 'COMPLETED', 'Club Week 2026');
