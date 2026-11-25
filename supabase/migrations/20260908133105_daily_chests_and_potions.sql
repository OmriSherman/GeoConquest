-- One server-selected reward per UTC day. Client retries replay the stored result.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.daily_chest_tiers (
  tier integer PRIMARY KEY CHECK (tier BETWEEN 1 AND 6),
  name text NOT NULL, gold integer NOT NULL, tickets integer NOT NULL,
  duration integer NOT NULL, odds integer[] NOT NULL,
  CHECK (cardinality(odds) = 5 AND 0 <= ALL(odds) AND
    odds[1]+odds[2]+odds[3]+odds[4]+odds[5] = 100)
);
INSERT INTO public.daily_chest_tiers VALUES
 (1,'Wooden',100,1,2,ARRAY[55,35,5,5,0]),
 (2,'Bronze',250,2,3,ARRAY[45,40,8,7,0]),
 (3,'Silver',400,3,3,ARRAY[35,35,15,12,3]),
 (4,'Gold',600,4,4,ARRAY[30,30,18,18,4]),
 (5,'Royal',750,6,5,ARRAY[30,30,18,18,4]),
 (6,'Legendary',1000,8,5,ARRAY[30,30,17,17,6]);
CREATE TABLE public.daily_chest_avatars (
  avatar_id text PRIMARY KEY, tier integer NOT NULL REFERENCES public.daily_chest_tiers(tier)
);
INSERT INTO public.daily_chest_avatars VALUES
 ('png_map_mouse',3),('png_compass_crow',3),('png_coin_crab',3),
 ('png_treasure_gecko',4),('png_gilded_cartographer',4),('png_ruby_scarab',4),
 ('png_duchess',5),('png_velvet_jackal',5),('png_worldshell_turtle',6),('png_eclipse_navigator',6);
CREATE TABLE public.daily_chest_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier integer NOT NULL DEFAULT 1 CHECK (tier BETWEEN 1 AND 6),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 3),
  last_claim_date date, reward jsonb
);
CREATE TABLE public.user_potions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('xp_potion','gold_potion')),
  duration integer NOT NULL CHECK (duration BETWEEN 2 AND 5),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  PRIMARY KEY(user_id,kind,duration)
);
CREATE TABLE public.active_potions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('xp_potion','gold_potion')),
  remaining integer NOT NULL CHECK (remaining BETWEEN 0 AND 5),
  activated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,kind)
);
ALTER TABLE public.daily_chest_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_chest_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_chest_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_potions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_potions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.daily_chest_tiers, public.daily_chest_avatars, public.daily_chest_state, public.user_potions, public.active_potions FROM anon, authenticated;
GRANT SELECT ON public.daily_chest_tiers, public.daily_chest_avatars, public.daily_chest_state, public.user_potions, public.active_potions TO authenticated;
CREATE POLICY chest_tiers_read ON public.daily_chest_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY chest_avatars_read ON public.daily_chest_avatars FOR SELECT TO authenticated USING (true);
CREATE POLICY chest_state_read ON public.daily_chest_state FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY potions_read ON public.user_potions FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);
CREATE POLICY active_potions_read ON public.active_potions FOR SELECT TO authenticated USING ((SELECT auth.uid())=user_id);

-- Progress is separate from login_streak: returning loses only one tier, once.
-- First upgrade takes 4 claims (days 1-4); subsequent upgrades take 4 more.
CREATE FUNCTION private.daily_chest(p_claim boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
<<chest_claim>>
DECLARE
 uid uuid := auth.uid(); today date := (now() AT TIME ZONE 'UTC')::date;
 s public.daily_chest_state%ROWTYPE; cfg public.daily_chest_tiers%ROWTYPE;
 p public.profiles%ROWTYPE; reward jsonb; available boolean; roll integer;
 idx integer := 1; cumulative integer := 0; kind text; amount integer; avatar text;
 mult integer; next_tier integer; next_progress integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
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
     IF next_progress=4 THEN next_tier:=next_tier+1; next_progress:=0; END IF;
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
   'available',available,'reward',s.reward,'server_date',today);
END $$;
REVOKE ALL ON FUNCTION private.daily_chest(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.daily_chest(boolean) TO authenticated;
CREATE FUNCTION public.get_daily_chest() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.daily_chest(false) $$;
CREATE FUNCTION public.claim_daily_chest() RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.daily_chest(true) $$;
REVOKE ALL ON FUNCTION public.get_daily_chest(),public.claim_daily_chest() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_daily_chest(),public.claim_daily_chest() TO authenticated;

-- Protect chest-exclusive avatars from both direct inserts and the shop RPC.
CREATE FUNCTION private.guard_chest_avatar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.item_type='avatar' AND EXISTS(SELECT 1 FROM public.daily_chest_avatars WHERE avatar_id=NEW.item_id)
 AND coalesce(current_setting('app.chest_avatar_grant',true),'')<>'on' THEN
   RAISE EXCEPTION 'This avatar is only available from daily chests';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_chest_avatar() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_chest_avatar BEFORE INSERT OR UPDATE ON public.user_unlocked_items FOR EACH ROW EXECUTE FUNCTION private.guard_chest_avatar();

CREATE FUNCTION private.activate_potion(p_kind text,p_duration integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.active_potions WHERE user_id=uid AND kind=p_kind AND remaining>0) THEN
   RAISE EXCEPTION 'This boost is already active';
 END IF;
 UPDATE public.user_potions SET quantity=quantity-1 WHERE user_id=uid AND kind=p_kind AND duration=p_duration AND quantity>0;
 IF NOT FOUND THEN RAISE EXCEPTION 'No potion available'; END IF;
 INSERT INTO public.active_potions(user_id,kind,remaining,activated_at) VALUES(uid,p_kind,p_duration,clock_timestamp())
 ON CONFLICT(user_id,kind) DO UPDATE SET remaining=excluded.remaining,activated_at=excluded.activated_at;
END $$;
REVOKE ALL ON FUNCTION private.activate_potion(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.activate_potion(text,integer) TO authenticated;
CREATE FUNCTION public.activate_potion(p_kind text,p_duration integer) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.activate_potion(p_kind,p_duration) $$;
REVOKE ALL ON FUNCTION public.activate_potion(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.activate_potion(text,integer) TO authenticated;

-- Quiz result retries use the same client key. A duplicate never consumes another charge.
ALTER TABLE public.quiz_results ADD COLUMN client_result_key text;
ALTER TABLE public.quiz_results ADD COLUMN potion_base_xp integer;
ALTER TABLE public.quiz_results ADD COLUMN potion_xp_bonus integer NOT NULL DEFAULT 0;
ALTER TABLE public.quiz_results ADD COLUMN potion_gold_bonus integer NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX quiz_results_client_key ON public.quiz_results(user_id,client_result_key);
CREATE FUNCTION private.apply_quiz_potions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bxp integer:=0; bgold integer:=0;
BEGIN
 NEW.potion_xp_bonus:=0; NEW.potion_gold_bonus:=0;
 IF NEW.client_result_key IS NULL OR NEW.potion_base_xp IS NULL THEN RETURN NEW; END IF;
 IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF NEW.potion_base_xp<0 OR NEW.potion_base_xp>coalesce(NEW.xp_earned,0) THEN RAISE EXCEPTION 'Invalid base XP'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=NEW.user_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.quiz_results WHERE user_id=NEW.user_id AND client_result_key=NEW.client_result_key) THEN
   RETURN NULL;
 END IF;
 UPDATE public.active_potions SET remaining=remaining-1 WHERE user_id=NEW.user_id AND kind='xp_potion' AND remaining>0;
 IF FOUND THEN bxp:=floor(NEW.potion_base_xp*0.5)::integer; END IF;
 UPDATE public.active_potions SET remaining=remaining-1 WHERE user_id=NEW.user_id AND kind='gold_potion' AND remaining>0;
 IF FOUND THEN bgold:=floor(greatest(0,NEW.gold_earned)*0.5)::integer; END IF;
 NEW.potion_xp_bonus:=bxp; NEW.potion_gold_bonus:=bgold;
 NEW.xp_earned:=NEW.xp_earned+bxp; NEW.gold_earned:=NEW.gold_earned+bgold;
 UPDATE public.profiles SET xp=coalesce(xp,0)+bxp,gold_balance=gold_balance+bgold WHERE id=NEW.user_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.apply_quiz_potions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER apply_quiz_potions BEFORE INSERT ON public.quiz_results FOR EACH ROW EXECUTE FUNCTION private.apply_quiz_potions();
