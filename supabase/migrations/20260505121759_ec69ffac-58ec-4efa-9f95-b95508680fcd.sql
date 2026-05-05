
CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  _count integer := 0;
BEGIN
  IF _uid IS NULL OR _email = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.account_members
  SET user_id = _uid
  WHERE lower(invited_email) = _email
    AND user_id <> _uid;

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pending_invitations() TO authenticated;
