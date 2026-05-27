-- ============================================================
-- Workflow updates: subcategories, per-month caps, DSP2 validation
-- ============================================================

-- 1. Subcategories — add parent_id + sort_order to expense_categories
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_expense_categories_parent
  ON public.expense_categories(parent_id);

-- 2. Subcategory field on expenses
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- 3. Per-month caps — add month/year columns to category_budget_configs
--    NULL month/year = global default (applies to all months without a specific config)
ALTER TABLE public.category_budget_configs
  ADD COLUMN IF NOT EXISTS month INTEGER CHECK (month IS NULL OR (month BETWEEN 0 AND 11)),
  ADD COLUMN IF NOT EXISTS year  INTEGER CHECK (year  IS NULL OR year >= 2020);

-- Drop old unique constraint (account_id, category_name) and replace with monthly-aware one
ALTER TABLE public.category_budget_configs
  DROP CONSTRAINT IF EXISTS category_budget_configs_account_id_category_name_key;

-- New partial unique index: (account, name, month, year) — NULLs treated as -1 for uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS category_budget_configs_monthly_uidx
  ON public.category_budget_configs (
    account_id,
    category_name,
    COALESCE(month, -1),
    COALESCE(year,  -1)
  );

-- 4. DSP2 validation flow — add status + suggestions to bank_synced_transactions
ALTER TABLE public.bank_synced_transactions
  ADD COLUMN IF NOT EXISTS validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending', 'validated', 'ignored')),
  ADD COLUMN IF NOT EXISTS suggested_category    TEXT,
  ADD COLUMN IF NOT EXISTS suggested_subcategory TEXT;

-- Back-fill: existing linked transactions (expense_id IS NOT NULL) = already validated
UPDATE public.bank_synced_transactions
  SET validation_status = 'validated'
  WHERE expense_id IS NOT NULL
    AND validation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_bank_synced_tx_pending
  ON public.bank_synced_transactions(account_id, validation_status)
  WHERE validation_status = 'pending';
