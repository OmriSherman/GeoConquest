ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mythic_chests INTEGER NOT NULL DEFAULT 0 CHECK (mythic_chests >= 0),
  ADD COLUMN IF NOT EXISTS mythic_month_key TEXT,
  ADD COLUMN IF NOT EXISTS mythic_lifetime_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.sync_mythic_chest_entitlement()
RETURNS JSONB
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_month_key TEXT := to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM');
  v_profile public.profiles%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF v_profile.is_conquerer AND v_profile.mythic_month_key IS DISTINCT FROM v_month_key THEN
    UPDATE public.profiles
    SET mythic_chests = mythic_chests + 1,
        mythic_month_key = v_month_key
    WHERE id = v_user_id
    RETURNING * INTO v_profile;
  END IF;

  IF v_profile.is_conquerer
    AND v_profile.conqueror_plan = 'unlimited'
    AND NOT v_profile.mythic_lifetime_bonus_claimed THEN
    UPDATE public.profiles
    SET mythic_chests = mythic_chests + 3,
        mythic_lifetime_bonus_claimed = TRUE
    WHERE id = v_user_id
    RETURNING * INTO v_profile;
  END IF;

  RETURN jsonb_build_object(
    'mythic_chests', v_profile.mythic_chests,
    'mythic_month_key', v_profile.mythic_month_key,
    'mythic_lifetime_bonus_claimed', v_profile.mythic_lifetime_bonus_claimed
  );
END;
$function$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.sync_mythic_chest_entitlement() TO authenticated;

NOTIFY pgrst, 'reload schema';
