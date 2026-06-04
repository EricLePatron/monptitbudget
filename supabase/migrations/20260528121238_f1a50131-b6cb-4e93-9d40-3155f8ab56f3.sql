
ALTER TABLE public.expense_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS expense_categories_parent_id_idx
  ON public.expense_categories(parent_id);
