
-- Table des connexions bancaires (sessions Enable Banking)
CREATE TABLE public.bank_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_country TEXT,
  bank_logo TEXT,
  bank_account_id TEXT,
  bank_account_iban TEXT,
  bank_account_name TEXT,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_bank_connections_account ON public.bank_connections(account_id);
CREATE INDEX idx_bank_connections_user ON public.bank_connections(user_id);

ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bank connections of their accounts"
  ON public.bank_connections FOR SELECT
  USING (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Members can create bank connections on their accounts"
  ON public.bank_connections FOR INSERT
  WITH CHECK (public.has_account_access(auth.uid(), account_id) AND user_id = auth.uid());

CREATE POLICY "Members can update bank connections of their accounts"
  ON public.bank_connections FOR UPDATE
  USING (public.has_account_access(auth.uid(), account_id));

CREATE POLICY "Members can delete bank connections of their accounts"
  ON public.bank_connections FOR DELETE
  USING (public.has_account_access(auth.uid(), account_id));

CREATE TRIGGER bank_connections_updated_at
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table des transactions déjà importées (pour éviter les doublons)
CREATE TABLE public.bank_synced_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  account_id UUID NOT NULL,
  transaction_id TEXT NOT NULL,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bank_connection_id, transaction_id)
);

CREATE INDEX idx_bank_synced_tx_connection ON public.bank_synced_transactions(bank_connection_id);
CREATE INDEX idx_bank_synced_tx_account ON public.bank_synced_transactions(account_id);

ALTER TABLE public.bank_synced_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view synced transactions of their accounts"
  ON public.bank_synced_transactions FOR SELECT
  USING (public.has_account_access(auth.uid(), account_id));
