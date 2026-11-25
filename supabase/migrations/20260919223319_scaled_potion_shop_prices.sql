CREATE OR REPLACE FUNCTION private.purchase_regular_potion(p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 uid uuid := auth.uid();
 price integer;
 balance integer;
 total_xp integer;
 player_level integer := 1;
 remaining_xp integer;
 needed integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
 IF p_kind NOT IN ('gold_potion','xp_potion') THEN RAISE EXCEPTION 'Invalid potion'; END IF;

 SELECT gold_balance, xp INTO balance, total_xp FROM public.profiles WHERE id = uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

 remaining_xp := greatest(coalesce(total_xp, 0), 0);
 LOOP
  needed := round(100 * power(player_level::numeric, 0.807))::integer;
  EXIT WHEN remaining_xp < needed;
  remaining_xp := remaining_xp - needed;
  player_level := player_level + 1;
 END LOOP;

 price := CASE p_kind
  WHEN 'gold_potion' THEN 500 + player_level * 10
  WHEN 'xp_potion' THEN 1000 + player_level * 20
 END;

 IF balance < price THEN RAISE EXCEPTION 'Insufficient gold'; END IF;
 UPDATE public.profiles SET gold_balance = gold_balance - price WHERE id = uid;
 INSERT INTO public.user_potions(user_id, kind, duration, quantity, boost_percent)
 VALUES(uid, p_kind, 3, 1, 50)
 ON CONFLICT(user_id, kind, duration) DO UPDATE SET quantity = public.user_potions.quantity + 1, boost_percent = 50;
END
$$;

REVOKE ALL ON FUNCTION private.purchase_regular_potion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.purchase_regular_potion(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.purchase_regular_potion(p_kind text) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $$ SELECT private.purchase_regular_potion(p_kind) $$;

REVOKE ALL ON FUNCTION public.purchase_regular_potion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_regular_potion(text) TO authenticated;
