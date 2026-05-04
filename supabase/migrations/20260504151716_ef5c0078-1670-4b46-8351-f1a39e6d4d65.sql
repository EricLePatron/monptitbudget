CREATE POLICY "Members can delete synced transactions of their accounts"
ON public.bank_synced_transactions
FOR DELETE
USING (has_account_access(auth.uid(), account_id));