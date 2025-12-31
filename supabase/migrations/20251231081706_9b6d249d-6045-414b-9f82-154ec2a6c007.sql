-- Add category column to expenses table
ALTER TABLE public.expenses ADD COLUMN category text;

-- Create a categories table for custom categories per account
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '📦',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(account_id, name)
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for expense_categories
CREATE POLICY "Users can view categories of their accounts"
ON public.expense_categories
FOR SELECT
USING (has_account_access(auth.uid(), account_id));

CREATE POLICY "Users can create categories on their accounts"
ON public.expense_categories
FOR INSERT
WITH CHECK (has_account_access(auth.uid(), account_id));

CREATE POLICY "Users can delete categories on their accounts"
ON public.expense_categories
FOR DELETE
USING (has_account_access(auth.uid(), account_id));

-- Insert default categories (will be added per account when needed)
