-- Prevent direct client updates to Conqueror entitlement fields.
-- Only server-side RPC flows should be able to modify these columns.

CREATE OR REPLACE FUNCTION public.guard_conqueror_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF
    NEW.is_conquerer IS DISTINCT FROM OLD.is_conquerer OR
    NEW.conqueror_plan IS DISTINCT FROM OLD.conqueror_plan OR
    NEW.conqueror_lifetime_bonus_claimed IS DISTINCT FROM OLD.conqueror_lifetime_bonus_claimed
  THEN
    IF COALESCE(current_setting('app.allow_conqueror_update', TRUE), '') <> 'on' THEN
      RAISE EXCEPTION 'Conqueror entitlement fields can only be updated by secure server functions';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_conqueror_profile_fields ON public.profiles;
CREATE TRIGGER trg_guard_conqueror_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.guard_conqueror_profile_fields();
