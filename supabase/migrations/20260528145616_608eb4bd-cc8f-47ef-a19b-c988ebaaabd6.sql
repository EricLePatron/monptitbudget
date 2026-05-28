CREATE TABLE public.category_budget_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  category_name TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'uncapped',
  cap_amount NUMERIC,
  warning_threshold INTEGER NOT NULL DEFAULT 80,
  color TEXT NOT NULL DEFAULT '#6366f1',
  group_name TEXT,
  month INTEGER,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX category_budget_configs_unique
  ON public.category_budget_configs (account_id, category_name, COALESCE(month, -1), COALESCE(year, -1));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_budget_configs TO authenticated;
GRANT ALL ON public.category_budget_configs TO service_role;

ALTER TABLE public.category_budget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view category budget configs"
  ON public.category_budget_configs FOR SELECT
  USING (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Members can create category budget configs"
  ON public.category_budget_configs FOR INSERT
  WITH CHECK (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Members can update category budget configs"
  ON public.category_budget_configs FOR UPDATE
  USING (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Members can delete category budget configs"
  ON public.category_budget_configs FOR DELETE
  USING (public.has_account_access(auth.uid(), account_id));

CREATE TRIGGER update_category_budget_configs_updated_at
  BEFORE UPDATE ON public.category_budget_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();