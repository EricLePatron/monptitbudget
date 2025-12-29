-- Migrate existing accounts: add owner membership for all existing accounts
INSERT INTO public.account_members (account_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.accounts
ON CONFLICT (account_id, user_id) DO NOTHING;