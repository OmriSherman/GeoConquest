-- Mythic Chest state, server-side reward rolls, dust, and guaranteed-choice rewards.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mythic_monthly_chests integer NOT NULL DEFAULT 0 CHECK (mythic_monthly_chests >= 0),
  ADD COLUMN IF NOT EXISTS mythic_bonus_chests integer NOT NULL DEFAULT 0 CHECK (mythic_bonus_chests >= 0),
  ADD COLUMN IF NOT EXISTS mythic_monthly_opened integer NOT NULL DEFAULT 0 CHECK (mythic_monthly_opened >= 0),
  ADD COLUMN IF NOT EXISTS mythic_dust integer NOT NULL DEFAULT 0 CHECK (mythic_dust >= 0);

-- Preserve balances created by the first Mythic entitlement migration when this
-- reward migration is applied to an already-running project.
UPDATE public.profiles
SET mythic_bonus_chests = mythic_chests
WHERE mythic_chests > 0 AND mythic_monthly_chests = 0 AND mythic_bonus_chests = 0;

ALTER TABLE public.user_potions DROP CONSTRAINT IF EXISTS user_potions_duration_check;
ALTER TABLE public.user_potions ADD CONSTRAINT user_potions_duration_check CHECK (duration BETWEEN 2 AND 10);
ALTER TABLE public.active_potions DROP CONSTRAINT IF EXISTS active_potions_remaining_check;
ALTER TABLE public.active_potions ADD CONSTRAINT active_potions_remaining_check CHECK (remaining BETWEEN 0 AND 50);
ALTER TABLE public.user_potions ADD COLUMN IF NOT EXISTS boost_percent integer NOT NULL DEFAULT 50 CHECK (boost_percent BETWEEN 1 AND 500);
ALTER TABLE public.active_potions ADD COLUMN IF NOT EXISTS boost_percent integer NOT NULL DEFAULT 50 CHECK (boost_percent BETWEEN 1 AND 500);

CREATE TABLE IF NOT EXISTS public.mythic_chest_avatars (
  avatar_id text PRIMARY KEY,
  bonus_kind text NOT NULL CHECK (bonus_kind IN ('gold','xp')),
  bonus_percent integer NOT NULL DEFAULT 10 CHECK (bonus_percent = 10)
);
INSERT INTO public.mythic_chest_avatars(avatar_id, bonus_kind) VALUES
  ('png_worldbreaker_empress','gold'),('png_storm_navigator','xp'),
  ('png_mapless_heroine','gold'),('png_mapless_hero','xp'),
  ('png_longitude_ronin','gold'),('png_meridian_oracle','xp'),
  ('png_border_phantom','gold'),('png_cosmic_pigeon','xp'),
  ('png_globe_eater','gold'),('png_conquest_frog','xp')
ON CONFLICT (avatar_id) DO NOTHING;
ALTER TABLE public.mythic_chest_avatars ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mythic_chest_avatars FROM anon, authenticated;
GRANT SELECT ON public.mythic_chest_avatars TO authenticated;
CREATE POLICY mythic_chest_avatars_read ON public.mythic_chest_avatars FOR SELECT TO authenticated USING (true);

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

CREATE OR REPLACE FUNCTION public.get_mythic_chest() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT public.sync_mythic_chest_entitlement() $$;

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

CREATE OR REPLACE FUNCTION public.claim_mythic_chest() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); p public.profiles%ROWTYPE; roll integer; kind text; avatar text; reward jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.sync_mythic_chest_entitlement();
  SELECT * INTO p FROM public.profiles WHERE id=uid FOR UPDATE;
  IF p.mythic_chests<=0 THEN RAISE EXCEPTION 'No Mythic Chests available'; END IF;
  IF p.mythic_monthly_chests>0 THEN
    UPDATE public.profiles SET mythic_monthly_chests=mythic_monthly_chests-1, mythic_monthly_opened=mythic_monthly_opened+1 WHERE id=uid;
  ELSE UPDATE public.profiles SET mythic_bonus_chests=mythic_bonus_chests-1 WHERE id=uid; END IF;
  roll:=floor(random()*100)::integer;
  kind:=CASE WHEN roll<56 THEN 'gold_25000' WHEN roll<66 THEN 'gold_75000' WHEN roll<71 THEN 'gold_150000'
    WHEN roll<74 THEN 'xp' WHEN roll<86 THEN 'xp_potion' WHEN roll<98 THEN 'gold_potion' ELSE 'avatar' END;
  IF kind='avatar' THEN
    SELECT a.avatar_id INTO avatar FROM public.mythic_chest_avatars a WHERE NOT EXISTS
      (SELECT 1 FROM public.user_unlocked_items u WHERE u.user_id=uid AND u.item_type='avatar' AND u.item_id=a.avatar_id)
      ORDER BY random() LIMIT 1;
    IF avatar IS NULL THEN kind:='gold_150000'; END IF;
  END IF;
  reward:=private.grant_mythic_reward(uid,kind,avatar);
  UPDATE public.profiles SET mythic_dust=mythic_dust+1, mythic_chests=mythic_monthly_chests+mythic_bonus_chests WHERE id=uid;
  SELECT * INTO p FROM public.profiles WHERE id=uid;
  RETURN jsonb_build_object('reward',reward,'dust_awarded',1,'mythic_dust',p.mythic_dust,
    'mythic_chests',p.mythic_chests,'mythic_monthly_chests',p.mythic_monthly_chests,
    'mythic_bonus_chests',p.mythic_bonus_chests,'mythic_monthly_opened',p.mythic_monthly_opened);
END $$;

CREATE OR REPLACE FUNCTION public.claim_mythic_choice(p_kind text, p_avatar text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); p public.profiles%ROWTYPE; reward jsonb; new_dust integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id=uid FOR UPDATE;
  IF p.mythic_dust<10 THEN RAISE EXCEPTION 'Need 10 Mythic Dust'; END IF;
  IF p_kind='avatar' AND (p_avatar IS NULL OR NOT EXISTS (SELECT 1 FROM public.mythic_chest_avatars WHERE avatar_id=p_avatar)) THEN RAISE EXCEPTION 'Invalid Mythic avatar'; END IF;
  UPDATE public.profiles SET mythic_dust=mythic_dust-10 WHERE id=uid;
  reward:=private.grant_mythic_reward(uid,p_kind,p_avatar);
  SELECT mythic_dust INTO new_dust FROM public.profiles WHERE id=uid;
  RETURN jsonb_build_object('reward',reward,'dust_consumed',10,'mythic_dust',new_dust);
END $$;

CREATE OR REPLACE FUNCTION private.guard_mythic_avatar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.item_type='avatar' AND EXISTS(SELECT 1 FROM public.mythic_chest_avatars WHERE avatar_id=NEW.item_id)
  AND coalesce(current_setting('app.mythic_chest_avatar_grant',true),'')<>'on' THEN RAISE EXCEPTION 'This avatar is only available from Mythic Chests'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_mythic_avatar BEFORE INSERT OR UPDATE ON public.user_unlocked_items FOR EACH ROW EXECUTE FUNCTION private.guard_mythic_avatar();

-- Mythic potions use the same inventory as daily potions, but carry a 200% boost.
CREATE OR REPLACE FUNCTION private.activate_potion(p_kind text,p_duration integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); b integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT boost_percent INTO b FROM public.user_potions WHERE user_id=uid AND kind=p_kind AND duration=p_duration AND quantity>0 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No potion available'; END IF;
 UPDATE public.user_potions SET quantity=quantity-1 WHERE user_id=uid AND kind=p_kind AND duration=p_duration AND quantity>0;
 INSERT INTO public.active_potions(user_id,kind,remaining,boost_percent,activated_at) VALUES(uid,p_kind,p_duration,b,clock_timestamp())
 ON CONFLICT(user_id,kind) DO UPDATE SET remaining=least(50,public.active_potions.remaining+excluded.remaining), boost_percent=greatest(public.active_potions.boost_percent,excluded.boost_percent), activated_at=excluded.activated_at;
END $$;

CREATE OR REPLACE FUNCTION private.apply_quiz_potions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bxp integer:=0; bgold integer:=0; xb integer:=0; gb integer:=0; abonus text; axp integer:=0; agold integer:=0;
BEGIN
 NEW.potion_xp_bonus:=0; NEW.potion_gold_bonus:=0;
 IF NEW.client_result_key IS NULL OR NEW.potion_base_xp IS NULL THEN RETURN NEW; END IF;
 IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF NEW.potion_base_xp<0 OR NEW.potion_base_xp>coalesce(NEW.xp_earned,0) THEN RAISE EXCEPTION 'Invalid base XP'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=NEW.user_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.quiz_results WHERE user_id=NEW.user_id AND client_result_key=NEW.client_result_key) THEN RETURN NULL; END IF;
 SELECT boost_percent INTO xb FROM public.active_potions WHERE user_id=NEW.user_id AND kind='xp_potion' AND remaining>0;
 IF FOUND THEN UPDATE public.active_potions SET remaining=remaining-1 WHERE user_id=NEW.user_id AND kind='xp_potion'; bxp:=floor(NEW.potion_base_xp*xb/100.0)::integer; END IF;
 SELECT boost_percent INTO gb FROM public.active_potions WHERE user_id=NEW.user_id AND kind='gold_potion' AND remaining>0;
 IF FOUND THEN UPDATE public.active_potions SET remaining=remaining-1 WHERE user_id=NEW.user_id AND kind='gold_potion'; bgold:=floor(greatest(0,NEW.gold_earned)*gb/100.0)::integer; END IF;
 NEW.potion_xp_bonus:=bxp; NEW.potion_gold_bonus:=bgold; NEW.xp_earned:=NEW.xp_earned+bxp; NEW.gold_earned:=NEW.gold_earned+bgold;
 SELECT bonus_kind INTO abonus FROM public.mythic_chest_avatars WHERE avatar_id=(SELECT avatar_emoji FROM public.profiles WHERE id=NEW.user_id);
 IF abonus='xp' THEN axp:=floor(NEW.xp_earned*0.10)::integer; ELSIF abonus='gold' THEN agold:=floor(greatest(0,NEW.gold_earned)*0.10)::integer; END IF;
 NEW.xp_earned:=NEW.xp_earned+axp; NEW.gold_earned:=NEW.gold_earned+agold;
 UPDATE public.profiles SET xp=coalesce(xp,0)+bxp+axp,gold_balance=gold_balance+bgold+agold WHERE id=NEW.user_id; RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.get_mythic_chest(),public.claim_mythic_chest(),public.claim_mythic_choice(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_mythic_chest(),public.claim_mythic_chest(),public.claim_mythic_choice(text,text) TO authenticated;
