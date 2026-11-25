-- Existing streaks keep their earned tier; future Conqueror upgrades take two claims.
CREATE OR REPLACE FUNCTION private.daily_chest(p_claim boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<chest_claim>>
DECLARE
 uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'UTC')::date;
 s public.daily_chest_state%ROWTYPE; cfg public.daily_chest_tiers%ROWTYPE;
 p public.profiles%ROWTYPE; reward jsonb; available boolean; roll integer;
 idx integer := 1; cumulative integer := 0; kind text; amount integer; avatar text;
 days_per_upgrade integer; mult integer; next_tier integer; next_progress integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 days_per_upgrade := CASE WHEN coalesce(p.is_conquerer,false) THEN 2 ELSE 4 END;
 INSERT INTO public.daily_chest_state(user_id,tier,progress,last_claim_date)
 VALUES(uid, least(6,greatest(1,coalesce(p.login_streak,0)/4+1)),
   CASE WHEN coalesce(p.login_streak,0)>=20 THEN 0 ELSE coalesce(p.login_streak,0)%4 END,
   (p.last_reward_claim AT TIME ZONE 'UTC')::date) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.daily_chest_state WHERE user_id=uid FOR UPDATE;
 available := greatest(s.last_claim_date,(p.last_reward_claim AT TIME ZONE 'UTC')::date) IS NULL
   OR greatest(s.last_claim_date,(p.last_reward_claim AT TIME ZONE 'UTC')::date)<today;
 next_tier := s.tier; next_progress := s.progress;
 IF available THEN
   IF s.last_claim_date < today-1 THEN
     next_tier := greatest(1,s.tier-1); next_progress := 0;
   END IF;
   IF next_tier<6 THEN
     next_progress := next_progress+1;
     IF next_progress>=days_per_upgrade THEN next_tier:=next_tier+1; next_progress:=0; END IF;
   END IF;
 END IF;
 IF p_claim AND available THEN
   SELECT * INTO cfg FROM public.daily_chest_tiers WHERE tier=next_tier;
   roll := floor(random()*100)::integer;
   WHILE idx<=5 LOOP
     cumulative:=cumulative+cfg.odds[idx]; EXIT WHEN roll<cumulative;
     idx:=idx+1;
   END LOOP;
   kind := (ARRAY['gold','tickets','xp_potion','gold_potion','avatar'])[idx];
   mult := CASE WHEN coalesce(p.is_conquerer,false) THEN 3 ELSE 1 END;
   amount := 1;
   reward := jsonb_build_object('kind',kind,'quantity',amount,'tier',next_tier);
   IF kind='avatar' THEN
     SELECT a.avatar_id INTO avatar FROM public.daily_chest_avatars a
     WHERE a.tier<=next_tier AND NOT EXISTS (
       SELECT 1 FROM public.user_unlocked_items u WHERE u.user_id=uid AND u.item_type='avatar' AND u.item_id=a.avatar_id)
     ORDER BY random() LIMIT 1;
     IF avatar IS NULL THEN
       kind:='gold'; reward:=reward||jsonb_build_object('duplicate_fallback',true);
     ELSE
       PERFORM set_config('app.chest_avatar_grant','on',true);
       INSERT INTO public.user_unlocked_items(user_id,item_type,item_id) VALUES(uid,'avatar',avatar);
       PERFORM set_config('app.chest_avatar_grant','off',true);
       reward:=reward||jsonb_build_object('avatar_id',avatar);
     END IF;
   END IF;
   IF kind='gold' THEN
     amount:=cfg.gold*mult;
     UPDATE public.profiles SET gold_balance=gold_balance+amount WHERE id=uid;
   ELSIF kind='tickets' THEN
     amount:=cfg.tickets*mult;
     UPDATE public.profiles SET tickets=coalesce(tickets,0)+amount WHERE id=uid;
   ELSIF kind IN ('xp_potion','gold_potion') THEN
     INSERT INTO public.user_potions(user_id,kind,duration,quantity) VALUES(uid,kind,cfg.duration,1)
     ON CONFLICT ON CONSTRAINT user_potions_pkey DO UPDATE SET quantity=public.user_potions.quantity+1;
     reward:=reward||jsonb_build_object('duration',cfg.duration,'boost_percent',50);
   END IF;
   reward:=reward||jsonb_build_object('kind',kind,'quantity',amount);
   UPDATE public.daily_chest_state SET tier=next_tier,progress=next_progress,last_claim_date=today,
     reward=chest_claim.reward WHERE user_id=uid;
   UPDATE public.profiles SET last_reward_claim=now(), login_streak=
     CASE WHEN (p.last_reward_claim AT TIME ZONE 'UTC')::date=today-1 THEN coalesce(p.login_streak,0)+1 ELSE 1 END WHERE id=uid;
   s.reward:=reward; s.last_claim_date:=today; available:=false;
 END IF;
 RETURN jsonb_build_object('tier',next_tier,'progress',next_progress,'last_claim_date',s.last_claim_date,
   'days_per_upgrade',days_per_upgrade,'available',available,'reward',s.reward,'server_date',today);
END $$;

-- Reward two maps per completed ad, within the existing five-map capacity.
CREATE OR REPLACE FUNCTION public.grant_ad_map()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_ad_used_at date;
  v_ad_count integer;
  v_today date := current_date;
BEGIN
  SELECT maps, maps_next_refill_at, maps_ad_used_at, COALESCE(maps_ad_count, 0)
    INTO v_maps, v_next_refill, v_ad_used_at, v_ad_count
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Reset count on new day
  IF v_ad_used_at IS NULL OR v_ad_used_at < v_today THEN
    v_ad_count := 0;
  END IF;

  IF v_ad_count >= 3 THEN
    RAISE EXCEPTION 'Ad limit reached for today';
  END IF;

  v_ad_count := v_ad_count + 1;

  IF v_maps < 5 THEN
    v_maps := least(5, v_maps + 2);
    IF v_maps >= 5 THEN v_next_refill := NULL; END IF;
  END IF;

  UPDATE profiles
     SET maps = v_maps,
         maps_next_refill_at = v_next_refill,
         maps_ad_used_at = v_today,
         maps_ad_count = v_ad_count
   WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'maps', v_maps,
    'maps_next_refill_at', v_next_refill,
    'ad_used_at', v_today,
    'ad_count', v_ad_count
  );
END;
$$;
