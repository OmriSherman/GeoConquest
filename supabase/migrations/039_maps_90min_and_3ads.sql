-- Change map refill cooldown from 2 hours to 90 minutes.
-- Allow up to 3 ad-map grants per UTC day (was 1).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS maps_ad_count integer NOT NULL DEFAULT 0;

-- deduct_map: 90-minute refill interval
CREATE OR REPLACE FUNCTION public.deduct_map()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_is_conquerer boolean;
  v_refill_interval interval := interval '90 minutes';
BEGIN
  SELECT maps, maps_next_refill_at, is_conquerer
    INTO v_maps, v_next_refill, v_is_conquerer
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  IF v_is_conquerer THEN
    RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'bypassed', true);
  END IF;

  WHILE v_maps < 5 AND v_next_refill IS NOT NULL AND v_next_refill <= now() LOOP
    v_maps := v_maps + 1;
    v_next_refill := v_next_refill + v_refill_interval;
  END LOOP;
  IF v_maps >= 5 THEN v_next_refill := NULL; END IF;

  IF v_maps <= 0 THEN RAISE EXCEPTION 'No maps remaining'; END IF;

  IF v_maps = 5 THEN v_next_refill := now() + v_refill_interval; END IF;
  v_maps := v_maps - 1;

  UPDATE profiles SET maps = v_maps, maps_next_refill_at = v_next_refill WHERE id = v_user_id;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'bypassed', false);
END;
$$;

-- grant_ad_map: up to 3 per UTC day
CREATE OR REPLACE FUNCTION public.grant_ad_map()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_ad_used_at date;
  v_ad_count integer;
  v_today date := current_date;
BEGIN
  SELECT maps, maps_next_refill_at, maps_ad_used_at, COALESCE(maps_ad_count, 0)
    INTO v_maps, v_next_refill, v_ad_used_at, v_ad_count
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Reset count on new day
  IF v_ad_used_at IS NULL OR v_ad_used_at < v_today THEN
    v_ad_count := 0;
  END IF;

  IF v_ad_count >= 3 THEN
    RAISE EXCEPTION 'Ad limit reached for today';
  END IF;

  v_ad_count := v_ad_count + 1;

  IF v_maps < 5 THEN
    v_maps := v_maps + 1;
    IF v_maps >= 5 THEN v_next_refill := NULL; END IF;
  END IF;

  UPDATE profiles
     SET maps = v_maps,
         maps_next_refill_at = v_next_refill,
         maps_ad_used_at = v_today,
         maps_ad_count = v_ad_count
   WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'maps', v_maps,
    'maps_next_refill_at', v_next_refill,
    'ad_used_at', v_today,
    'ad_count', v_ad_count
  );
END;
$$;

-- sync_maps_refill: 90-minute refill interval
CREATE OR REPLACE FUNCTION public.sync_maps_refill()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_refill_interval interval := interval '90 minutes';
  v_changed boolean := false;
BEGIN
  SELECT maps, maps_next_refill_at
    INTO v_maps, v_next_refill
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  WHILE v_maps < 5 AND v_next_refill IS NOT NULL AND v_next_refill <= now() LOOP
    v_maps := v_maps + 1;
    v_next_refill := v_next_refill + v_refill_interval;
    v_changed := true;
  END LOOP;

  IF v_maps >= 5 THEN
    v_next_refill := NULL;
    IF NOT (v_maps = 5 AND NOT v_changed) THEN v_changed := true; END IF;
  END IF;

  IF v_changed THEN
    UPDATE profiles SET maps = v_maps, maps_next_refill_at = v_next_refill WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ad_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_maps_refill() TO authenticated;
