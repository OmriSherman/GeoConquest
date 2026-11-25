-- Run after the migration in a disposable database or inside BEGIN / ROLLBACK.
DO $$
DECLARE
 uid uuid:=gen_random_uuid(); first jsonb; replay jsonb; state jsonb;
 day integer; expected_tier integer; k integer; t integer; remaining_count integer;
 result_id uuid; bonus_xp integer; bonus_gold integer;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(uid,'chest-test-'||uid||'@example.invalid','{}');
 INSERT INTO public.profiles(id,username,gold_balance,xp) VALUES(uid,'chest-test-'||uid,0,0) ON CONFLICT(id) DO NOTHING;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 UPDATE public.profiles SET login_streak=0,last_reward_claim=null,gold_balance=0,xp=0,tickets=0 WHERE id=uid;
 FOR day IN 1..24 LOOP
   IF day>1 THEN
     UPDATE public.daily_chest_state SET last_claim_date=(now() AT TIME ZONE 'UTC')::date-1 WHERE user_id=uid;
     UPDATE public.profiles SET last_reward_claim=now()-interval '1 day' WHERE id=uid;
   END IF;
   state:=public.get_daily_chest();
   expected_tier:=least(6,day/4+1);
   ASSERT (state->>'tier')::integer=expected_tier, 'Wrong upgrade day';
   ASSERT (state->>'available')::boolean, 'Chest should be available';
   first:=public.claim_daily_chest(); replay:=public.claim_daily_chest();
   ASSERT first=replay, 'Retry must replay same reward';
   ASSERT (first->'reward'->>'quantity')::integer>0, 'Empty reward';
 END LOOP;
 UPDATE public.daily_chest_state SET last_claim_date=(now() AT TIME ZONE 'UTC')::date-5 WHERE user_id=uid;
 UPDATE public.profiles SET last_reward_claim=now()-interval '5 days' WHERE id=uid;
 state:=public.get_daily_chest(); replay:=public.get_daily_chest();
 ASSERT state=replay AND (state->>'tier')::integer=5 AND (state->>'progress')::integer=1, 'Missed day drops once';
 PERFORM public.claim_daily_chest();
 ASSERT (public.get_daily_chest()->>'tier')::integer=5, 'Repeated load must not drop again';

 -- Force each reward branch at every tier. Transaction rolls all edits back.
 FOR t IN 1..6 LOOP
   FOR k IN 1..5 LOOP
     UPDATE public.daily_chest_tiers SET odds=ARRAY[
       CASE WHEN k=1 THEN 100 ELSE 0 END,CASE WHEN k=2 THEN 100 ELSE 0 END,
       CASE WHEN k=3 THEN 100 ELSE 0 END,CASE WHEN k=4 THEN 100 ELSE 0 END,
       CASE WHEN k=5 THEN 100 ELSE 0 END] WHERE tier=t;
     UPDATE public.daily_chest_state SET tier=t,progress=0,last_claim_date=(now() AT TIME ZONE 'UTC')::date-1 WHERE user_id=uid;
     UPDATE public.profiles SET last_reward_claim=now()-interval '1 day' WHERE id=uid;
     state:=public.claim_daily_chest();
     ASSERT (state->'reward'->>'quantity')::integer>0, 'Reward branch was empty';
     IF k=1 THEN ASSERT state->'reward'->>'kind'='gold', 'Wrong gold branch'; END IF;
     IF k=2 THEN ASSERT state->'reward'->>'kind'='tickets', 'Wrong tickets branch'; END IF;
     IF k=3 OR k=4 THEN ASSERT (state->'reward'->>'boost_percent')::integer=50, 'Wrong potion strength'; END IF;
   END LOOP;
 END LOOP;
 -- Every eligible avatar is owned: avatar drop must turn into tier gold.
 PERFORM set_config('app.chest_avatar_grant','on',true);
 INSERT INTO public.user_unlocked_items(user_id,item_type,item_id)
 SELECT uid,'avatar',avatar_id FROM public.daily_chest_avatars ON CONFLICT DO NOTHING;
 PERFORM set_config('app.chest_avatar_grant','off',true);
 UPDATE public.daily_chest_state SET tier=6,last_claim_date=(now() AT TIME ZONE 'UTC')::date-1 WHERE user_id=uid;
 UPDATE public.profiles SET last_reward_claim=now()-interval '1 day' WHERE id=uid;
 state:=public.claim_daily_chest();
 ASSERT state->'reward'->>'kind'='gold' AND (state->'reward'->>'duplicate_fallback')::boolean, 'Avatar fallback';

 PERFORM public.activate_potion('xp_potion',2);
 PERFORM public.activate_potion('gold_potion',2);
 BEGIN
   PERFORM public.activate_potion('xp_potion',3);
   RAISE EXCEPTION 'Stacking unexpectedly allowed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'This boost is already active' THEN RAISE; END IF;
 END;
 INSERT INTO public.quiz_results(user_id,quiz_type,score,total_questions,gold_earned,xp_earned,potion_base_xp,client_result_key)
 VALUES(uid,'flag',5,10,100,80,40,'chest-test-1') RETURNING id,potion_xp_bonus,potion_gold_bonus INTO result_id,bonus_xp,bonus_gold;
 ASSERT bonus_xp=20 AND bonus_gold=50,'Potion bonuses must use base earnings';
 INSERT INTO public.quiz_results(user_id,quiz_type,score,total_questions,gold_earned,xp_earned,potion_base_xp,client_result_key)
 VALUES(uid,'flag',5,10,100,80,40,'chest-test-1');
 SELECT remaining INTO remaining_count FROM public.active_potions WHERE user_id=uid AND kind='xp_potion';
 ASSERT remaining_count=1,'Duplicate result consumed a potion charge';
 INSERT INTO public.quiz_results(user_id,quiz_type,score,total_questions,gold_earned,xp_earned,potion_base_xp,client_result_key)
 VALUES(uid,'flag',0,10,-100,0,0,'chest-test-2') RETURNING potion_xp_bonus,potion_gold_bonus INTO bonus_xp,bonus_gold;
 ASSERT bonus_xp=0 AND bonus_gold=0,'Potions must not increase penalties';
 SELECT remaining INTO remaining_count FROM public.active_potions WHERE user_id=uid AND kind='xp_potion';
 ASSERT remaining_count=0,'Potion did not expire';
 ASSERT NOT has_table_privilege('authenticated','public.user_potions','INSERT'), 'Inventory is client writable';
 ASSERT NOT has_function_privilege('anon','public.claim_daily_chest()','EXECUTE'),'Anonymous claim allowed';
 -- Test the real authenticated role, not only the database owner.
 EXECUTE 'SET LOCAL ROLE authenticated';
 state:=public.get_daily_chest();
 ASSERT NOT (state->>'available')::boolean, 'Authenticated state read failed';
 BEGIN
   INSERT INTO public.user_potions(user_id,kind,duration,quantity) VALUES(uid,'xp_potion',2,99);
   RAISE EXCEPTION 'Inventory write unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 BEGIN
   INSERT INTO public.user_unlocked_items(user_id,item_type,item_id) VALUES(uid,'avatar','png_map_mouse');
   RAISE EXCEPTION 'Direct avatar grant unexpectedly allowed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM<>'This avatar is only available from daily chests' THEN RAISE; END IF;
 END;
 PERFORM public.activate_potion('xp_potion',3);
 INSERT INTO public.quiz_results(user_id,quiz_type,score,total_questions,gold_earned,xp_earned,potion_base_xp,client_result_key)
 VALUES(uid,'flag',5,10,100,80,40,'chest-authenticated') RETURNING potion_xp_bonus INTO bonus_xp;
 ASSERT bonus_xp=20,'Authenticated potion trigger failed';
 EXECUTE 'RESET ROLE';
END $$;
