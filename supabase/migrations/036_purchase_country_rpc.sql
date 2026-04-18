CREATE OR REPLACE FUNCTION public.purchase_country(
  p_country_code TEXT,
  p_cost INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_current_gold INTEGER;
  v_new_balance INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT gold_balance
  INTO v_current_gold
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_current_gold IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.owned_countries
    WHERE user_id = v_user_id
      AND country_code = p_country_code
  ) THEN
    RAISE EXCEPTION 'Country already owned';
  END IF;

  IF v_current_gold < p_cost THEN
    RAISE EXCEPTION 'Insufficient gold';
  END IF;

  v_new_balance := v_current_gold - p_cost;

  UPDATE public.profiles
  SET gold_balance = v_new_balance
  WHERE id = v_user_id;

  INSERT INTO public.owned_countries (user_id, country_code)
  VALUES (v_user_id, p_country_code);

  RETURN v_new_balance;
END;
$$;

NOTIFY pgrst, 'reload schema';
