DROP INDEX IF EXISTS public.idx_bank_synced_transactions_account_amount_date;

CREATE UNIQUE INDEX IF NOT EXISTS bank_synced_transactions_account_amount_date_uidx
ON public.bank_synced_transactions (account_id, transaction_date, amount);