
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS is_direct_debit boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_expenses_is_direct_debit
ON public.expenses (budget_id) WHERE is_direct_debit = true;
