-- Referral bonus popups:
-- 1) keep referee bonus on first quiz completion
-- 2) queue a popup event for the referrer as well
-- 3) expose an RPC to consume unseen referral popup events

CREATE TABLE IF NOT EXISTS public.referral_bonus_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  gold_amount INTEGER NOT NULL CHECK (gold_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referral_bonus_notifications_user_seen
  ON public.referral_bonus_notifications (user_id, seen_at, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_referral_bonus()
RETURNS TABLE (success BOOLEAN, gold_awarded INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_referred_by TEXT;
  v_already_claimed BOOLEAN;
  v_referrer_id UUID;
  v_bonus INTEGER := 1500;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT referred_by, referral_bonus_claimed
  INTO v_referred_by, v_already_claimed
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  -- Already claimed or no referrer — nothing to do
  IF v_already_claimed OR v_referred_by IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Prevent self-referral
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND lower(username) = lower(v_referred_by)
  ) THEN
    UPDATE public.profiles
    SET referral_bonus_claimed = TRUE
    WHERE id = v_user_id;

    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Look up referrer by username (case-insensitive)
  SELECT id
  INTO v_referrer_id
  FROM public.profiles
  WHERE lower(username) = lower(v_referred_by)
  LIMIT 1;

  -- Referrer no longer exists — mark claimed to stop retries
  IF v_referrer_id IS NULL THEN
    UPDATE public.profiles
    SET referral_bonus_claimed = TRUE
    WHERE id = v_user_id;

    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Award bonus to both users
  UPDATE public.profiles
  SET
    gold_balance = gold_balance + v_bonus,
    referral_bonus_claimed = TRUE
  WHERE id = v_user_id;

  UPDATE public.profiles
  SET gold_balance = gold_balance + v_bonus
  WHERE id = v_referrer_id;

  -- Queue popup notifications for both referee and referrer
  INSERT INTO public.referral_bonus_notifications (user_id, source_user_id, gold_amount)
  VALUES
    (v_user_id, v_referrer_id, v_bonus),
    (v_referrer_id, v_user_id, v_bonus);

  RETURN QUERY SELECT TRUE, v_bonus;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_referral_bonus_notifications()
RETURNS TABLE(total_gold INTEGER, rewards_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH consumed AS (
    UPDATE public.referral_bonus_notifications
    SET seen_at = now()
    WHERE user_id = v_user_id
      AND seen_at IS NULL
    RETURNING gold_amount
  )
  SELECT
    COALESCE(SUM(gold_amount), 0)::INTEGER AS total_gold,
    COUNT(*)::INTEGER AS rewards_count
  FROM consumed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_referral_bonus() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_referral_bonus_notifications() TO authenticated;

NOTIFY pgrst, 'reload schema';
