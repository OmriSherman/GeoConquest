-- Chest avatars are also purchasable in the Daily Chest collection.
-- Keep direct client inserts blocked while allowing the trusted shop RPC.
CREATE OR REPLACE FUNCTION private.guard_chest_avatar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.item_type='avatar' AND EXISTS(SELECT 1 FROM public.daily_chest_avatars WHERE avatar_id=NEW.item_id)
 AND coalesce(current_setting('app.chest_avatar_grant',true),'')<>'on'
 AND coalesce(current_setting('app.avatar_shop_grant',true),'')<>'on' THEN
   RAISE EXCEPTION 'Use the daily chest or avatar shop to unlock this avatar';
 END IF;
 RETURN NEW;
END $$;

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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_angry_man','png_osi_boi','png_freegle','png_euro_bro','png_triboi',
    'png_divine_high_king','png_divine_high_queen','png_world_ender',
    'png_rotten_crown','png_meme_relic_frog'
  ]) THEN RAISE EXCEPTION 'Quest reward items cannot be purchased'; END IF;

  SELECT gold_balance, COALESCE(is_conquerer, FALSE)
  INTO v_current_gold, v_is_conquerer
  FROM public.profiles WHERE id = v_user_id FOR UPDATE;
  IF v_current_gold IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF p_item_type = 'avatar' AND p_item_id = ANY (ARRAY[
    'png_nana','png_piga','png_demon','png_apple_a_day','png_glitched_jester'
  ]) AND NOT v_is_conquerer THEN
    RAISE EXCEPTION 'Conqueror subscription required for this avatar';
  END IF;
  IF v_current_gold < p_cost THEN RAISE EXCEPTION 'Insufficient gold'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_unlocked_items WHERE user_id=v_user_id AND item_type=p_item_type AND item_id=p_item_id) THEN
    RAISE EXCEPTION 'Item already unlocked';
  END IF;

  UPDATE public.profiles SET gold_balance = gold_balance - p_cost WHERE id = v_user_id;
  PERFORM set_config('app.avatar_shop_grant','on',true);
  INSERT INTO public.user_unlocked_items (user_id,item_type,item_id) VALUES (v_user_id,p_item_type,p_item_id);
  PERFORM set_config('app.avatar_shop_grant','off',true);
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_avatar_item(TEXT,TEXT,INTEGER) TO authenticated;
