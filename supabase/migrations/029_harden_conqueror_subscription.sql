-- Harden Conqueror activation:
-- 1) tie activation to auth.uid() instead of client-provided UUID
-- 2) make lifetime bonus idempotent (no repeated 100k/30 grants)
-- 3) preserve plan metadata on profile

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS conqueror_plan TEXT,
  ADD COLUMN IF NOT EXISTS conqueror_lifetime_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.activate_conqueror_subscription(
  p_user_id UUID,
  p_plan TEXT
)
RETURNS JSONB
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_bonus_granted BOOLEAN := FALSE;
  v_bonus_already_claimed BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN
    RAISE EXCEPTION 'Invalid user for activation';
  END IF;

  IF p_plan NOT IN ('unlimited', 'monthly') THEN
    RAISE EXCEPTION 'Invalid conqueror plan';
  END IF;

  -- Lock target row during entitlement update
  SELECT COALESCE(conqueror_lifetime_bonus_claimed, FALSE)
  INTO v_bonus_already_claimed
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF p_plan = 'unlimited' THEN
    v_bonus_granted := NOT v_bonus_already_claimed;
    PERFORM set_config('app.allow_conqueror_update', 'on', TRUE);

    UPDATE public.profiles
    SET
      is_conquerer = TRUE,
      conqueror_plan = 'unlimited',
      gold_balance = gold_balance + CASE WHEN v_bonus_already_claimed THEN 0 ELSE 100000 END,
      tickets = COALESCE(tickets, 0) + CASE WHEN v_bonus_already_claimed THEN 0 ELSE 30 END,
      conqueror_lifetime_bonus_claimed = TRUE
    WHERE id = v_user_id;
  ELSE
    PERFORM set_config('app.allow_conqueror_update', 'on', TRUE);

    UPDATE public.profiles
    SET
      is_conquerer = TRUE,
      conqueror_plan = CASE WHEN conqueror_plan = 'unlimited' THEN 'unlimited' ELSE 'monthly' END
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'plan', p_plan,
    'is_conquerer', TRUE,
    'bonus_granted', v_bonus_granted
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'bonus_granted', FALSE
  );
END;
$function$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.activate_conqueror_subscription(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
