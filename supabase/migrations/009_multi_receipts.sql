-- Migration 009: Add multi-receipt support (up to 3 images per transaction)

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS receipt_urls TEXT[] DEFAULT '{}';

-- Backfill receipt_urls from existing receipt_url
UPDATE public.transactions
SET receipt_urls = ARRAY[receipt_url]
WHERE receipt_url IS NOT NULL 
  AND (receipt_urls IS NULL OR cardinality(receipt_urls) = 0);

-- Comment for schema documentation
COMMENT ON COLUMN public.transactions.receipt_urls IS 'Array of Supabase Storage public URLs for receipts/proofs (max 3 images per transaction as per LITE policies)';
