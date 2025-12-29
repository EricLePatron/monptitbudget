-- Add savings column to budgets table
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS savings numeric DEFAULT 0;