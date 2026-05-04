
CREATE OR REPLACE FUNCTION public.link_pending_invitations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IS NULL OR TG_NAME IS NULL THEN
    RAISE EXCEPTION 'This function can only be called from a trigger';
  END IF;
  UPDATE public.account_members
  SET user_id = NEW.id
  WHERE lower(invited_email) = lower(NEW.email)
    AND user_id <> NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_pending_invitations_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IS NULL OR TG_NAME IS NULL THEN
    RAISE EXCEPTION 'This function can only be called from a trigger';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email
     OR (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    UPDATE public.account_members
    SET user_id = NEW.id
    WHERE lower(invited_email) = lower(NEW.email)
      AND user_id <> NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IS NULL OR TG_NAME IS NULL THEN
    RAISE EXCEPTION 'This function can only be called from a trigger';
  END IF;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'owner');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP IS NULL OR TG_NAME IS NULL THEN
    RAISE EXCEPTION 'This function can only be called from a trigger';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;
