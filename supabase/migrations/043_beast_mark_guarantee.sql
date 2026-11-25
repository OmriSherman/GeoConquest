-- Guarantee that every nightmare_complete quest claim also unlocks the Beast Mark
-- as item_type = 'avatar' so it appears in the owned avatars tab.

CREATE OR REPLACE FUNCTION public.trg_grant_nightmare_beast_mark()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.achievement_id = 'nightmare_complete' THEN
    INSERT INTO public.user_unlocked_items (user_id, item_id, item_type)
    VALUES (NEW.user_id, 'png_beast_mark', 'avatar')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_beast_mark_on_nightmare_claim ON public.user_achievements;

CREATE TRIGGER trg_beast_mark_on_nightmare_claim
  AFTER INSERT ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_grant_nightmare_beast_mark();

-- Migrate any existing Beast Mark rows from item → avatar so they show in the shop
UPDATE public.user_unlocked_items
SET item_type = 'avatar'
WHERE item_id = 'png_beast_mark' AND item_type != 'avatar';

-- ── Fix user asork (id: 23cbaebf-8c67-4416-b142-b662afccb13d) ────────────────
DO $$
DECLARE
  v_user_id uuid := '23cbaebf-8c67-4416-b142-b662afccb13d';
  v_already_claimed boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_achievements
    WHERE user_id = v_user_id AND achievement_id = 'nightmare_complete'
  ) INTO v_already_claimed;

  -- Insert quest claim (trigger fires automatically → grants Beast Mark)
  INSERT INTO public.user_achievements (user_id, achievement_id, claimed_at)
  VALUES (v_user_id, 'nightmare_complete', now())
  ON CONFLICT DO NOTHING;

  -- Only grant gold if this is the first-time claim
  IF NOT v_already_claimed THEN
    UPDATE public.profiles
    SET gold_balance = COALESCE(gold_balance, 0) + 25000
    WHERE id = v_user_id;
  END IF;

  -- Belt-and-suspenders: ensure Beast Mark is present as avatar type
  INSERT INTO public.user_unlocked_items (user_id, item_id, item_type)
  VALUES (v_user_id, 'png_beast_mark', 'avatar')
  ON CONFLICT (user_id, item_id) DO UPDATE SET item_type = 'avatar';
END;
$$;
