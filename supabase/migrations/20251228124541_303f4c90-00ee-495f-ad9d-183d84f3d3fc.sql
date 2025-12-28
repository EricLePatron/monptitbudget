-- Drop the old unique constraint that doesn't include account_id
ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_month_year_key;

-- Create a new unique constraint that includes account_id
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_account_month_year_key 
UNIQUE (user_id, account_id, month, year);

-- Delete old budgets without account_id (orphaned from before the accounts feature)
DELETE FROM public.budgets WHERE account_id IS NULL;