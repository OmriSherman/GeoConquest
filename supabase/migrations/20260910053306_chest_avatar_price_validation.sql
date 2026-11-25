ALTER TABLE public.daily_chest_avatars ADD COLUMN IF NOT EXISTS price integer;
UPDATE public.daily_chest_avatars SET price = CASE avatar_id
  WHEN 'png_map_mouse' THEN 2500 WHEN 'png_compass_crow' THEN 3000 WHEN 'png_coin_crab' THEN 3500
  WHEN 'png_treasure_gecko' THEN 5000 WHEN 'png_gilded_cartographer' THEN 6000 WHEN 'png_ruby_scarab' THEN 7000
  WHEN 'png_duchess' THEN 9000 WHEN 'png_velvet_jackal' THEN 10000
  WHEN 'png_worldshell_turtle' THEN 15000 WHEN 'png_eclipse_navigator' THEN 18000
END
WHERE avatar_id IN (
  'png_map_mouse','png_compass_crow','png_coin_crab','png_treasure_gecko','png_gilded_cartographer',
  'png_ruby_scarab','png_duchess','png_velvet_jackal','png_worldshell_turtle','png_eclipse_navigator'
);

CREATE OR REPLACE FUNCTION public.purchase_avatar_item(
    p_item_type TEXT,
    p_item_id TEXT,
    p_cost INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_is_conquerer BOOLEAN;
  v_expected_cost INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_angry_man','png_osi_boi','png_freegle','png_euro_bro','png_triboi',
    'png_divine_high_king','png_divine_high_queen','png_world_ender',
    'png_rotten_crown','png_meme_relic_frog'
  ]) THEN RAISE EXCEPTION 'Quest reward items cannot be purchased'; END IF;
  SELECT price INTO v_expected_cost FROM public.daily_chest_avatars WHERE avatar_id=p_item_id AND p_item_type='avatar';
  IF v_expected_cost IS NOT NULL AND p_cost <> v_expected_cost THEN
    RAISE EXCEPTION 'Invalid avatar price';
  END IF;
  SELECT gold_balance, COALESCE(is_conquerer, FALSE) INTO v_current_gold, v_is_conquerer
  FROM public.profiles WHERE id=v_user_id FOR UPDATE;
  IF v_current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_nana','png_piga','png_demon','png_apple_a_day','png_glitched_jester'
  ]) AND NOT v_is_conquerer THEN RAISE EXCEPTION 'Conqueror subscription required for this avatar'; END IF;
  IF v_current_gold < p_cost THEN RAISE EXCEPTION 'Insufficient gold'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id=v_user_id AND item_type=p_item_type AND item_id=p_item_id) THEN
    RAISE EXCEPTION 'Item already unlocked';
  END IF;
  UPDATE public.profiles SET gold_balance=gold_balance-p_cost WHERE id=v_user_id;
  PERFORM set_config('app.avatar_shop_grant','on',true);
  INSERT INTO public.user_unlocked_items(user_id,item_type,item_id) VALUES(v_user_id,p_item_type,p_item_id);
  PERFORM set_config('app.avatar_shop_grant','off',true);
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_avatar_item(TEXT,TEXT,INTEGER) TO authenticated;
