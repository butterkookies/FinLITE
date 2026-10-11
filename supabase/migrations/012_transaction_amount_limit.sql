ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_amount_max_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_amount_max_check
  CHECK (amount > 0 AND amount <= 99999.99) NOT VALID;