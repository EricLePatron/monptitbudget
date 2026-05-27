-- Category budget configurations: allows setting fixed/variable caps per category
CREATE TABLE IF NOT EXISTS category_budget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_name TEXT NOT NULL,
  budget_type TEXT NOT NULL DEFAULT 'uncapped' CHECK (budget_type IN ('fixed', 'variable', 'uncapped')),
  cap_amount NUMERIC(10,2),
  warning_threshold INTEGER NOT NULL DEFAULT 80 CHECK (warning_threshold BETWEEN 0 AND 100),
  color TEXT NOT NULL DEFAULT '#6366f1',
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, category_name)
);

ALTER TABLE category_budget_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "category_budget_configs_account_access"
  ON category_budget_configs
  FOR ALL
  USING (has_account_access(account_id))
  WITH CHECK (has_account_access(account_id));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_category_budget_configs_updated_at'
  ) THEN
    CREATE TRIGGER update_category_budget_configs_updated_at
      BEFORE UPDATE ON category_budget_configs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END;
$$;
