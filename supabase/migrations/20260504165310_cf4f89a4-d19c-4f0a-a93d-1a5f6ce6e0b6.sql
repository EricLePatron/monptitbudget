-- Function to link pending invitations to a newly registered user
CREATE OR REPLACE FUNCTION public.link_pending_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.account_members
  SET user_id = NEW.id
  WHERE lower(invited_email) = lower(NEW.email)
    AND user_id <> NEW.id;
  RETURN NEW;
END;
$$;

-- Trigger on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created_link_invitations ON auth.users;
CREATE TRIGGER on_auth_user_created_link_invitations
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_pending_invitations();

-- Also handle email confirmation / email change updates
CREATE OR REPLACE FUNCTION public.link_pending_invitations_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email
     OR (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    UPDATE public.account_members
    SET user_id = NEW.id
    WHERE lower(invited_email) = lower(NEW.email)
      AND user_id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_updated_link_invitations ON auth.users;
CREATE TRIGGER on_auth_user_updated_link_invitations
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_pending_invitations_on_update();

-- Backfill: link any existing pending invitations for users that already exist
UPDATE public.account_members am
SET user_id = u.id
FROM auth.users u
WHERE lower(am.invited_email) = lower(u.email)
  AND am.user_id <> u.id;