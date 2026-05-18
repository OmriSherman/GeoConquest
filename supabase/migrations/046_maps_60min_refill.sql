-- Change map refill cooldown from 90 minutes to 60 minutes.

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
  v_refill_interval interval := interval '60 minutes';
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

CREATE OR REPLACE FUNCTION public.sync_maps_refill()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_refill_interval interval := interval '60 minutes';
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
GRANT EXECUTE ON FUNCTION public.sync_maps_refill() TO authenticated;
