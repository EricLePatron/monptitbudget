
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','validated','ignored')),
  ADD COLUMN IF NOT EXISTS suggested_category TEXT,
  ADD COLUMN IF NOT EXISTS suggested_subcategory TEXT;

UPDATE public.expenses SET validation_status = 'validated' WHERE validation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_expenses_pending
  ON public.expenses(budget_id, validation_status)
  WHERE validation_status = 'pending';

ALTER TABLE public.bank_synced_transactions
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','validated','ignored')),
  ADD COLUMN IF NOT EXISTS suggested_category TEXT,
  ADD COLUMN IF NOT EXISTS suggested_subcategory TEXT;

UPDATE public.bank_synced_transactions
  SET validation_status = 'validated'
  WHERE expense_id IS NOT NULL AND validation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bank_synced_tx_pending
  ON public.bank_synced_transactions(account_id, validation_status)
  WHERE validation_status = 'pending';

ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_expense_categories_parent ON public.expense_categories(parent_id);
