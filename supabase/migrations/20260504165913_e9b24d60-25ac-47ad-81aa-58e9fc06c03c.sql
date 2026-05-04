
-- Trigger functions: only postgres/triggers should call them
REVOKE EXECUTE ON FUNCTION public.link_pending_invitations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_pending_invitations_on_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_account() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- RLS helper functions: only authenticated need execute (used in policies via SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.has_account_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_expense_access(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_account_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_expense_access(uuid, uuid) TO authenticated;
