CREATE UNIQUE INDEX IF NOT EXISTS bank_synced_transactions_account_transaction_uidx
ON public.bank_synced_transactions (account_id, transaction_id);

CREATE INDEX IF NOT EXISTS idx_bank_synced_transactions_account_amount_date
ON public.bank_synced_transactions (account_id, amount, transaction_date);