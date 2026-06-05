ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_validation_status_check;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_validation_status_check
  CHECK (validation_status IN ('pending','validated','ignored','projected') OR validation_status IS NULL);

UPDATE public.expenses
SET validation_status = 'projected'
WHERE is_direct_debit = true
  AND validation_status = 'validated'
  AND id NOT IN (SELECT expense_id FROM public.bank_synced_transactions WHERE expense_id IS NOT NULL);

UPDATE public.expenses
SET is_direct_debit = false
WHERE is_direct_debit = true
  AND id IN (SELECT expense_id FROM public.bank_synced_transactions WHERE expense_id IS NOT NULL);