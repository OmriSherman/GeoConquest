-- Conqueror balance update:
-- monthly: 1 Mythic Chest/month
-- lifetime: 3 upfront Mythic Chests + monthly chest, 10 tickets, no 100k gold

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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_user_id IS NOT NULL AND p_user_id <> v_user_id THEN RAISE EXCEPTION 'Invalid user for activation'; END IF;
  IF p_plan NOT IN ('unlimited', 'monthly') THEN RAISE EXCEPTION 'Invalid conqueror plan'; END IF;

  SELECT COALESCE(conqueror_lifetime_bonus_claimed, FALSE)
  INTO v_bonus_already_claimed
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  PERFORM set_config('app.allow_conqueror_update', 'on', TRUE);
  IF p_plan = 'unlimited' THEN
    v_bonus_granted := NOT v_bonus_already_claimed;
    UPDATE public.profiles
    SET is_conquerer = TRUE,
        conqueror_plan = 'unlimited',
        tickets = COALESCE(tickets, 0) + CASE WHEN v_bonus_already_claimed THEN 0 ELSE 10 END,
        conqueror_lifetime_bonus_claimed = TRUE
    WHERE id = v_user_id;
  ELSE
    UPDATE public.profiles
    SET is_conquerer = TRUE,
        conqueror_plan = CASE WHEN conqueror_plan = 'unlimited' THEN 'unlimited' ELSE 'monthly' END
    WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'plan', p_plan, 'is_conquerer', TRUE, 'bonus_granted', v_bonus_granted);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM, 'bonus_granted', FALSE);
END;
$function$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.sync_mythic_chest_entitlement()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid := auth.uid(); p public.profiles%ROWTYPE; month_key text := to_char((now() AT TIME ZONE 'UTC'),'YYYY-MM');
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id=uid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p.is_conquerer AND p.mythic_month_key IS DISTINCT FROM month_key THEN
    UPDATE public.profiles SET mythic_monthly_chests=1, mythic_monthly_opened=0, mythic_month_key=month_key WHERE id=uid;
  END IF;
  SELECT * INTO p FROM public.profiles WHERE id=uid;
  IF p.conqueror_plan='unlimited' AND NOT p.mythic_lifetime_bonus_claimed THEN
    UPDATE public.profiles SET mythic_bonus_chests=mythic_bonus_chests+3, mythic_lifetime_bonus_claimed=true WHERE id=uid;
    SELECT * INTO p FROM public.profiles WHERE id=uid;
  END IF;
  UPDATE public.profiles SET mythic_chests=mythic_monthly_chests+mythic_bonus_chests WHERE id=uid;
  SELECT * INTO p FROM public.profiles WHERE id=uid;
  RETURN jsonb_build_object('mythic_chests',p.mythic_chests,'mythic_monthly_chests',p.mythic_monthly_chests,
    'mythic_bonus_chests',p.mythic_bonus_chests,'mythic_monthly_opened',p.mythic_monthly_opened,
    'mythic_dust',p.mythic_dust,'mythic_month_key',p.mythic_month_key,
    'mythic_lifetime_bonus_claimed',p.mythic_lifetime_bonus_claimed);
END $$;

CREATE OR REPLACE FUNCTION private.grant_mythic_reward(uid uuid, p_kind text, p_avatar text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE amount integer := 1; reward jsonb;
BEGIN
  IF p_kind='gold_25000' THEN amount:=25000; UPDATE public.profiles SET gold_balance=gold_balance+amount WHERE id=uid; reward:=jsonb_build_object('kind','gold','quantity',amount);
  ELSIF p_kind='gold_75000' THEN amount:=75000; UPDATE public.profiles SET gold_balance=gold_balance+amount WHERE id=uid; reward:=jsonb_build_object('kind','gold','quantity',amount);
  ELSIF p_kind='gold_150000' THEN amount:=150000; UPDATE public.profiles SET gold_balance=gold_balance+amount WHERE id=uid; reward:=jsonb_build_object('kind','gold','quantity',amount);
  ELSIF p_kind='xp' THEN amount:=20000; UPDATE public.profiles SET xp=coalesce(xp,0)+amount WHERE id=uid; reward:=jsonb_build_object('kind','xp','quantity',amount,'no_level_up_gold',true);
  ELSIF p_kind IN ('xp_potion','gold_potion') THEN
    INSERT INTO public.user_potions(user_id,kind,duration,quantity,boost_percent) VALUES(uid,p_kind,10,1,200)
    ON CONFLICT(user_id,kind,duration) DO UPDATE SET quantity=public.user_potions.quantity+1, boost_percent=greatest(public.user_potions.boost_percent,200);
    reward:=jsonb_build_object('kind',p_kind,'quantity',1,'duration',10,'boost_percent',200);
  ELSIF p_kind='avatar' AND p_avatar IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.user_unlocked_items WHERE user_id=uid AND item_type='avatar' AND item_id=p_avatar) THEN
      amount:=25000; UPDATE public.profiles SET gold_balance=gold_balance+amount WHERE id=uid; RETURN jsonb_build_object('kind','gold','quantity',amount,'duplicate_fallback',true);
    END IF;
    PERFORM set_config('app.mythic_chest_avatar_grant','on',true);
    INSERT INTO public.user_unlocked_items(user_id,item_type,item_id) VALUES(uid,'avatar',p_avatar);
    PERFORM set_config('app.mythic_chest_avatar_grant','off',true);
    reward:=jsonb_build_object('kind','avatar','quantity',1,'avatar_id',p_avatar);
  ELSE RAISE EXCEPTION 'Invalid Mythic reward'; END IF;
  RETURN reward;
END $$;

GRANT EXECUTE ON FUNCTION public.activate_conqueror_subscription(UUID, TEXT), public.sync_mythic_chest_entitlement() TO authenticated;
NOTIFY pgrst, 'reload schema';
