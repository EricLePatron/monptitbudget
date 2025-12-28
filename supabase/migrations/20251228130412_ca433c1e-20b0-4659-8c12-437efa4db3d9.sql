-- Add salary and deductions columns to budgets table for calculator mode
ALTER TABLE public.budgets 
ADD COLUMN salary numeric DEFAULT NULL,
ADD COLUMN deductions jsonb DEFAULT NULL;