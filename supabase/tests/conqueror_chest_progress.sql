-- Run against a disposable migrated database. All test data is rolled back.
BEGIN;
DO $$
DECLARE
 uid uuid := gen_random_uuid();
 result jsonb;
 day integer;
 period integer;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data)
 VALUES(uid,'progress-test-'||uid||'@example.invalid','{}');
 INSERT INTO public.profiles(id,username,gold_balance,xp)
 VALUES(uid,'progress-test-'||uid,0,0) ON CONFLICT(id) DO NOTHING;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 FOREACH period IN ARRAY ARRAY[4,2] LOOP
   UPDATE public.profiles SET is_conquerer=(period=2),login_streak=0,last_reward_claim=null WHERE id=uid;
   DELETE FROM public.daily_chest_state WHERE user_id=uid;
   FOR day IN 1..20 LOOP
     IF day>1 THEN
       UPDATE public.daily_chest_state SET last_claim_date=(now() AT TIME ZONE 'UTC')::date-1 WHERE user_id=uid;
       UPDATE public.profiles SET last_reward_claim=now()-interval '1 day' WHERE id=uid;
     END IF;
     result := public.claim_daily_chest();
     ASSERT (result->>'tier')::integer=least(6,day/period+1), 'Incorrect upgrade cadence';
     ASSERT result=public.claim_daily_chest(), 'Repeated claim advanced progress';
   END LOOP;
 END LOOP;
 -- A newly upgraded subscriber with three existing progress days must not get stuck.
 UPDATE public.daily_chest_state SET tier=2,progress=3,last_claim_date=(now() AT TIME ZONE 'UTC')::date-1 WHERE user_id=uid;
 UPDATE public.profiles SET last_reward_claim=now()-interval '1 day' WHERE id=uid;
 result := public.claim_daily_chest();
 ASSERT (result->>'tier')::integer=3 AND (result->>'progress')::integer=0, 'Subscription transition stalled';
 UPDATE public.profiles SET maps=0,maps_ad_count=0,maps_ad_used_at=null WHERE id=uid;
 result := public.grant_ad_map();
 ASSERT (result->>'maps')::integer=2, 'Ad did not award two maps';
 result := public.grant_ad_map();
 ASSERT (result->>'maps')::integer=4, 'Second ad did not award two maps';
 result := public.grant_ad_map();
 ASSERT (result->>'maps')::integer=5, 'Map capacity exceeded';
END $$;
ROLLBACK;
