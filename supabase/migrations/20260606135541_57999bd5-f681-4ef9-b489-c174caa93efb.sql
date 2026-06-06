UPDATE public.expenses
SET is_direct_debit = true
WHERE name LIKE '🏦 %'
  AND is_direct_debit = false
  AND (validation_status IS NULL OR validation_status IN ('pending', 'validated'));