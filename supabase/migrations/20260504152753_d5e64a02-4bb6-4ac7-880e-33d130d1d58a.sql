CREATE POLICY "Members can create synced transactions for their accounts"
ON public.bank_synced_transactions
FOR INSERT
TO public
WITH CHECK (public.has_account_access(auth.uid(), account_id));