BEGIN;
DO $$
DECLARE
 uid uuid := gen_random_uuid();
 result jsonb;
 n integer;
BEGIN
 INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES(uid,'ad-test-'||uid||'@example.invalid','{}');
 INSERT INTO public.profiles(id,username,tickets) VALUES(uid,'ad-test-'||uid,0) ON CONFLICT(id) DO UPDATE SET tickets=0;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 FOR n IN 1..3 LOOP
   result := public.ticket_ad_reward(false);
   ASSERT (result->>'remaining')::integer=4-n, 'Preflight consumed allowance';
   result := public.ticket_ad_reward(true);
   ASSERT (result->>'remaining')::integer=3-n, 'Wrong allowance';
   ASSERT (result->>'tickets')::integer=n, 'Wrong ticket award';
 END LOOP;
 BEGIN
   PERFORM public.ticket_ad_reward(true);
   RAISE EXCEPTION 'Fourth claim succeeded';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM NOT LIKE 'You have claimed all 3%' THEN RAISE; END IF;
 END;
 UPDATE private.ticket_ad_claims SET claim_date=claim_date-1 WHERE user_id=uid;
 result := public.ticket_ad_reward(true);
 ASSERT (result->>'remaining')::integer=2 AND (result->>'tickets')::integer=4, 'Next day did not reset';
 ASSERT NOT has_function_privilege('anon','public.ticket_ad_reward(boolean)','EXECUTE'), 'Anonymous grant allowed';
 ASSERT NOT has_table_privilege('authenticated','private.ticket_ad_claims','UPDATE'), 'Client can reset allowance';
END $$;
ROLLBACK;
