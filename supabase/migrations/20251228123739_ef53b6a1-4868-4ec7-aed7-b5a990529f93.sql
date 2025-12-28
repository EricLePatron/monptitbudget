-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '💰',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts
CREATE POLICY "Users can view their own accounts"
ON public.accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
ON public.accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Add account_id to budgets table
ALTER TABLE public.budgets
ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- Create trigger for updated_at on accounts
CREATE TRIGGER update_accounts_updated_at
BEFORE UPDATE ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();