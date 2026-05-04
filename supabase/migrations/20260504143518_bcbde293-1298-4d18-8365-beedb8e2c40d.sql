
-- 1. Drop exposed email column on expenses
ALTER TABLE public.expenses DROP COLUMN IF EXISTS user_email;

-- 2. Add UPDATE policy for expense_categories
CREATE POLICY "Users can update categories on their accounts"
ON public.expense_categories
FOR UPDATE
USING (has_account_access(auth.uid(), account_id))
WITH CHECK (has_account_access(auth.uid(), account_id));

-- 3. Explicit deny UPDATE on account_members
CREATE POLICY "No updates to account members"
ON public.account_members
FOR UPDATE
USING (false)
WITH CHECK (false);
