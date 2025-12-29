-- Create account_members table for shared accounts
CREATE TABLE public.account_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  invited_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (account_id, user_id)
);

-- Enable RLS
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

-- Create a security definer function to check if user has access to account
CREATE OR REPLACE FUNCTION public.has_account_access(_user_id uuid, _account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.account_members
    WHERE user_id = _user_id
      AND account_id = _account_id
  )
$$;

-- RLS policies for account_members
CREATE POLICY "Users can view members of accounts they have access to"
ON public.account_members
FOR SELECT
USING (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Account owners can add members"
ON public.account_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_id = account_members.account_id
      AND user_id = auth.uid()
      AND role = 'owner'
  )
  OR NOT EXISTS (
    SELECT 1 FROM public.account_members WHERE account_id = account_members.account_id
  )
);

CREATE POLICY "Account owners can remove members"
ON public.account_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.account_members am
    WHERE am.account_id = account_members.account_id
      AND am.user_id = auth.uid()
      AND am.role = 'owner'
  )
);

-- Update accounts RLS to use shared access
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view accounts they have access to"
ON public.accounts
FOR SELECT
USING (public.has_account_access(auth.uid(), id));

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update accounts they have access to"
ON public.accounts
FOR UPDATE
USING (public.has_account_access(auth.uid(), id));

-- Keep create policy for owner only
DROP POLICY IF EXISTS "Users can create their own accounts" ON public.accounts;
CREATE POLICY "Users can create their own accounts"
ON public.accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Only owner can delete
DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Owners can delete their accounts"
ON public.accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Update budgets RLS to use shared access
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
CREATE POLICY "Users can view budgets of shared accounts"
ON public.budgets
FOR SELECT
USING (public.has_account_access(auth.uid(), account_id));

DROP POLICY IF EXISTS "Users can create their own budgets" ON public.budgets;
CREATE POLICY "Users can create budgets on shared accounts"
ON public.budgets
FOR INSERT
WITH CHECK (public.has_account_access(auth.uid(), account_id));

DROP POLICY IF EXISTS "Users can update their own budgets" ON public.budgets;
CREATE POLICY "Users can update budgets on shared accounts"
ON public.budgets
FOR UPDATE
USING (public.has_account_access(auth.uid(), account_id));

DROP POLICY IF EXISTS "Users can delete their own budgets" ON public.budgets;
CREATE POLICY "Users can delete budgets on shared accounts"
ON public.budgets
FOR DELETE
USING (public.has_account_access(auth.uid(), account_id));

-- Update expenses RLS to use shared access (via budget -> account)
CREATE OR REPLACE FUNCTION public.has_expense_access(_user_id uuid, _budget_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.budgets b
    WHERE b.id = _budget_id
      AND public.has_account_access(_user_id, b.account_id)
  )
$$;

DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
CREATE POLICY "Users can view expenses of shared accounts"
ON public.expenses
FOR SELECT
USING (public.has_expense_access(auth.uid(), budget_id));

DROP POLICY IF EXISTS "Users can create their own expenses" ON public.expenses;
CREATE POLICY "Users can create expenses on shared accounts"
ON public.expenses
FOR INSERT
WITH CHECK (public.has_expense_access(auth.uid(), budget_id));

DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
CREATE POLICY "Users can update expenses on shared accounts"
ON public.expenses
FOR UPDATE
USING (public.has_expense_access(auth.uid(), budget_id));

DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;
CREATE POLICY "Users can delete expenses on shared accounts"
ON public.expenses
FOR DELETE
USING (public.has_expense_access(auth.uid(), budget_id));

-- Add user_email column to expenses to track who made each expense
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Create trigger to auto-add owner as member when account is created
CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_account_created
  AFTER INSERT ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_account();