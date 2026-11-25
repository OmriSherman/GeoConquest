UPDATE public.daily_chest_tiers SET gold=CASE tier
 WHEN 1 THEN 250 WHEN 2 THEN 400 WHEN 3 THEN 500 WHEN 4 THEN 600 WHEN 5 THEN 800 WHEN 6 THEN 1000 END
WHERE tier BETWEEN 1 AND 6;

CREATE FUNCTION private.purchase_regular_potion(p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); price integer; balance integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 price:=CASE p_kind WHEN 'gold_potion' THEN 250 WHEN 'xp_potion' THEN 500 END;
 IF price IS NULL THEN RAISE EXCEPTION 'Invalid potion'; END IF;
 SELECT gold_balance INTO balance FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
 IF balance<price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;
 UPDATE public.profiles SET gold_balance=gold_balance-price WHERE id=uid;
 INSERT INTO public.user_potions(user_id,kind,duration,quantity,boost_percent) VALUES(uid,p_kind,3,1,50)
 ON CONFLICT(user_id,kind,duration) DO UPDATE SET quantity=public.user_potions.quantity+1;
END $$;
REVOKE ALL ON FUNCTION private.purchase_regular_potion(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.purchase_regular_potion(text) TO authenticated;
CREATE FUNCTION public.purchase_regular_potion(p_kind text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.purchase_regular_potion(p_kind) $$;
REVOKE ALL ON FUNCTION public.purchase_regular_potion(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.purchase_regular_potion(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
