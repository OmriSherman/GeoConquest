-- Maps system: each quiz costs 1 map, Conquerors are exempt.
-- 5 maps max, refill 1 every 2 hours. Perfect score (100%) refunds the map.
-- One ad per day grants 1 map back.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS maps integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS maps_next_refill_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS maps_ad_used_at date DEFAULT NULL;

-- Clamp any out-of-range values that might exist
UPDATE profiles SET maps = 5 WHERE maps > 5;
UPDATE profiles SET maps = 0 WHERE maps < 0;

-- RPC: deduct a map. Returns new maps count and next_refill_at.
-- No-ops for Conquerors. Raises if already at 0.
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
  v_refill_interval interval := interval '2 hours';
BEGIN
  SELECT maps, maps_next_refill_at, is_conquerer
    INTO v_maps, v_next_refill, v_is_conquerer
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- Conquerors always pass through
  IF v_is_conquerer THEN
    RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'bypassed', true);
  END IF;

  -- Compute any time-based refills before deducting
  WHILE v_maps < 5 AND v_next_refill IS NOT NULL AND v_next_refill <= now() LOOP
    v_maps := v_maps + 1;
    v_next_refill := v_next_refill + v_refill_interval;
  END LOOP;
  IF v_maps >= 5 THEN
    v_next_refill := NULL;
  END IF;

  IF v_maps <= 0 THEN
    RAISE EXCEPTION 'No maps remaining';
  END IF;

  -- If this is the first deduction from a full chest, start the refill clock
  IF v_maps = 5 THEN
    v_next_refill := now() + v_refill_interval;
  END IF;

  v_maps := v_maps - 1;

  UPDATE profiles
     SET maps = v_maps,
         maps_next_refill_at = v_next_refill
   WHERE id = v_user_id;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'bypassed', false);
END;
$$;

-- RPC: refund a map (called on perfect score).
CREATE OR REPLACE FUNCTION public.refund_map()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
BEGIN
  SELECT maps, maps_next_refill_at
    INTO v_maps, v_next_refill
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_maps >= 5 THEN
    RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill);
  END IF;

  v_maps := v_maps + 1;
  IF v_maps >= 5 THEN
    v_next_refill := NULL;
  END IF;

  UPDATE profiles
     SET maps = v_maps,
         maps_next_refill_at = v_next_refill
   WHERE id = v_user_id;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill);
END;
$$;

-- RPC: grant 1 map via ad watch (max once per UTC day).
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
  v_today date := current_date;
BEGIN
  SELECT maps, maps_next_refill_at, maps_ad_used_at
    INTO v_maps, v_next_refill, v_ad_used_at
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_ad_used_at IS NOT NULL AND v_ad_used_at >= v_today THEN
    RAISE EXCEPTION 'Ad map already used today';
  END IF;

  IF v_maps < 5 THEN
    v_maps := v_maps + 1;
    IF v_maps >= 5 THEN
      v_next_refill := NULL;
    END IF;
  END IF;

  UPDATE profiles
     SET maps = v_maps,
         maps_next_refill_at = v_next_refill,
         maps_ad_used_at = v_today
   WHERE id = v_user_id;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'ad_used_at', v_today);
END;
$$;

-- RPC: compute time-based refills on app open (no-op if nothing to refill).
CREATE OR REPLACE FUNCTION public.sync_maps_refill()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_maps integer;
  v_next_refill timestamptz;
  v_refill_interval interval := interval '2 hours';
  v_changed boolean := false;
BEGIN
  SELECT maps, maps_next_refill_at
    INTO v_maps, v_next_refill
    FROM profiles
   WHERE id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  WHILE v_maps < 5 AND v_next_refill IS NOT NULL AND v_next_refill <= now() LOOP
    v_maps := v_maps + 1;
    v_next_refill := v_next_refill + v_refill_interval;
    v_changed := true;
  END LOOP;

  IF v_maps >= 5 THEN
    v_next_refill := NULL;
    IF NOT (v_maps = 5 AND NOT v_changed) THEN
      v_changed := true;
    END IF;
  END IF;

  IF v_changed THEN
    UPDATE profiles
       SET maps = v_maps,
           maps_next_refill_at = v_next_refill
     WHERE id = v_user_id;
  END IF;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill);
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_ad_map() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_maps_refill() TO authenticated;
