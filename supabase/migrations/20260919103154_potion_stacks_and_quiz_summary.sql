-- Accept every quiz currently shipped by the app.
ALTER TABLE public.quiz_results DROP CONSTRAINT IF EXISTS quiz_results_quiz_type_check;
ALTER TABLE public.quiz_results ADD CONSTRAINT quiz_results_quiz_type_check
 CHECK (quiz_type IN ('flag','shape','capitals','borders','millionaire','nightmare','trail','gauntlet','draw'));
ALTER TABLE public.quiz_results ADD COLUMN IF NOT EXISTS potions_used jsonb NOT NULL DEFAULT '[]';

-- Keep regular and Mythic effect durations separate. Same-strength uses extend duration.
ALTER TABLE public.active_potions DROP CONSTRAINT active_potions_pkey;
ALTER TABLE public.active_potions ADD PRIMARY KEY(user_id,kind,boost_percent);

CREATE OR REPLACE FUNCTION private.activate_potion(p_kind text,p_duration integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); b integer; remaining_uses integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT boost_percent INTO b FROM public.user_potions
 WHERE user_id=uid AND kind=p_kind AND duration=p_duration AND quantity>0 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No potion available'; END IF;
 SELECT remaining INTO remaining_uses FROM public.active_potions
 WHERE user_id=uid AND kind=p_kind AND boost_percent=b;
 IF coalesce(remaining_uses,0)+p_duration>50 THEN RAISE EXCEPTION 'This potion stack can hold up to 50 quiz uses'; END IF;
 UPDATE public.user_potions SET quantity=quantity-1 WHERE user_id=uid AND kind=p_kind AND duration=p_duration;
 INSERT INTO public.active_potions(user_id,kind,remaining,boost_percent,activated_at)
 VALUES(uid,p_kind,p_duration,b,clock_timestamp())
 ON CONFLICT(user_id,kind,boost_percent) DO UPDATE
 SET remaining=public.active_potions.remaining+excluded.remaining,activated_at=excluded.activated_at;
END $$;

CREATE OR REPLACE FUNCTION private.apply_quiz_potions() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE effect record; bonus integer; bxp integer:=0; bgold integer:=0;
BEGIN
 NEW.potion_xp_bonus:=0; NEW.potion_gold_bonus:=0; NEW.potions_used:='[]'::jsonb;
 IF NEW.client_result_key IS NULL OR NEW.potion_base_xp IS NULL THEN RETURN NEW; END IF;
 IF NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF NEW.potion_base_xp<0 OR NEW.potion_base_xp>coalesce(NEW.xp_earned,0) THEN RAISE EXCEPTION 'Invalid base XP'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=NEW.user_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.quiz_results WHERE user_id=NEW.user_id AND client_result_key=NEW.client_result_key) THEN RETURN NULL; END IF;
 FOR effect IN SELECT kind,remaining,boost_percent FROM public.active_potions
   WHERE user_id=NEW.user_id AND remaining>0 ORDER BY kind,boost_percent FOR UPDATE LOOP
   bonus:=floor((CASE WHEN effect.kind='xp_potion' THEN NEW.potion_base_xp ELSE greatest(0,NEW.gold_earned) END)*effect.boost_percent/100.0)::integer;
   IF effect.kind='xp_potion' THEN bxp:=bxp+bonus; ELSE bgold:=bgold+bonus; END IF;
   UPDATE public.active_potions SET remaining=remaining-1
   WHERE user_id=NEW.user_id AND kind=effect.kind AND boost_percent=effect.boost_percent;
   NEW.potions_used:=NEW.potions_used||jsonb_build_array(jsonb_build_object(
     'kind',effect.kind,'boost_percent',effect.boost_percent,'bonus',bonus,'remaining',effect.remaining-1));
 END LOOP;
 NEW.potion_xp_bonus:=bxp; NEW.potion_gold_bonus:=bgold;
 NEW.xp_earned:=NEW.xp_earned+bxp; NEW.gold_earned:=NEW.gold_earned+bgold;
 UPDATE public.profiles SET xp=coalesce(xp,0)+bxp,gold_balance=gold_balance+bgold WHERE id=NEW.user_id;
 RETURN NEW;
END $$;
NOTIFY pgrst, 'reload schema';
