-- ==============================================================================
-- FinLITE Database Migration 036: Fix Transaction Comments Sync Trigger
-- Resolves runtime PostgreSQL error: record "new" has no field "content"
-- ==============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_comments') THEN
    ALTER TABLE public.transaction_comments
      ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS comment_text TEXT,
      ADD COLUMN IF NOT EXISTS content TEXT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_sync_transaction_comments_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync author_id <-> user_id
  IF NEW.author_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.author_id := NEW.user_id;
  ELSIF NEW.user_id IS NULL AND NEW.author_id IS NOT NULL THEN
    NEW.user_id := NEW.author_id;
  END IF;

  -- Sync comment_text <-> comment
  IF NEW.comment_text IS NULL AND NEW.comment IS NOT NULL THEN
    NEW.comment_text := NEW.comment;
  ELSIF NEW.comment IS NULL AND NEW.comment_text IS NOT NULL THEN
    NEW.comment := NEW.comment_text;
  END IF;

  -- Sync content alias
  IF NEW.content IS NULL THEN
    NEW.content := COALESCE(NEW.comment, NEW.comment_text);
  ELSIF NEW.comment IS NULL THEN
    NEW.comment := NEW.content;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaction_comments') THEN
    DROP TRIGGER IF EXISTS trg_sync_transaction_comments_columns ON public.transaction_comments;
    CREATE TRIGGER trg_sync_transaction_comments_columns
      BEFORE INSERT OR UPDATE ON public.transaction_comments
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_sync_transaction_comments_columns();
  END IF;
END $$;
