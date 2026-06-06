UPDATE public.expenses e
SET is_direct_debit = false
WHERE e.name LIKE '🏦 %'
  AND e.is_direct_debit = true
  AND (e.validation_status IS NULL OR e.validation_status <> 'projected')
  AND NOT EXISTS (
    SELECT 1
    FROM public.expenses p
    WHERE p.name = e.name
      AND p.validation_status = 'projected'
      AND p.is_direct_debit = true
  );