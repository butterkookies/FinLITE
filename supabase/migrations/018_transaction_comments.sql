-- ==============================================================================
-- FinLITE Database Migration 018: Transaction Comments & Audit Remarks
-- Implements 3NF table for internal officer remarks and auditor verification notes
-- Compliant with PDM CCS Institutional Audit Standards & 3NF Architecture
-- ==============================================================================

-- 1. Create 3NF table transaction_comments
CREATE TABLE IF NOT EXISTS public.transaction_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid comment retrieval & chronological timeline rendering
CREATE INDEX IF NOT EXISTS idx_transaction_comments_tx_created ON public.transaction_comments (transaction_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_transaction_comments_user ON public.transaction_comments (user_id);

-- 2. Row Level Security (RLS)
ALTER TABLE public.transaction_comments ENABLE ROW LEVEL SECURITY;

-- Read policy: Authenticated officers can read transaction comments
DROP POLICY IF EXISTS "Authenticated officers can read transaction comments" ON public.transaction_comments;
CREATE POLICY "Authenticated officers can read transaction comments"
  ON public.transaction_comments FOR SELECT
  TO authenticated
  USING (true);

-- Insert policy: Authenticated officers can insert remarks
DROP POLICY IF EXISTS "Authenticated officers can insert transaction comments" ON public.transaction_comments;
CREATE POLICY "Authenticated officers can insert transaction comments"
  ON public.transaction_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR auth.uid() IS NOT NULL
  );

-- Update policy: Authors or admins can update remarks
DROP POLICY IF EXISTS "Authors or admins can update transaction comments" ON public.transaction_comments;
CREATE POLICY "Authors or admins can update transaction comments"
  ON public.transaction_comments FOR UPDATE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );

-- Delete policy: Authors or admins can delete remarks
DROP POLICY IF EXISTS "Authors or admins can delete transaction comments" ON public.transaction_comments;
CREATE POLICY "Authors or admins can delete transaction comments"
  ON public.transaction_comments FOR DELETE
  TO authenticated
  USING (
    user_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
