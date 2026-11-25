-- Economy balance updates.
-- Perfect quizzes now have a 30% chance to refund the consumed map.
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

  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  -- Keep the reward server-side so clients cannot force a refund.
  IF random() >= 0.30 OR v_maps >= 5 THEN
    RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'refunded', false);
  END IF;

  v_maps := v_maps + 1;
  IF v_maps >= 5 THEN v_next_refill := NULL; END IF;

  UPDATE profiles
     SET maps = v_maps, maps_next_refill_at = v_next_refill
   WHERE id = v_user_id;

  RETURN jsonb_build_object('maps', v_maps, 'maps_next_refill_at', v_next_refill, 'refunded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.refund_map() TO authenticated;
