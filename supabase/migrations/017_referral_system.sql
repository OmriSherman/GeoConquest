-- Add referral tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by TEXT,
  ADD COLUMN IF NOT EXISTS referral_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE;

-- Awards 500 gold to both the referred user and the referrer.
-- Called after the referred user's first quiz completion.
-- Idempotent: referral_bonus_claimed prevents double-claiming.
CREATE OR REPLACE FUNCTION public.claim_referral_bonus()
RETURNS TABLE (success BOOLEAN, gold_awarded INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_referred_by   TEXT;
  v_already_claimed BOOLEAN;
  v_referrer_id   UUID;
  v_bonus         INTEGER := 1500;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT referred_by, referral_bonus_claimed
  INTO v_referred_by, v_already_claimed
  FROM public.profiles
  WHERE id = v_user_id;

  -- Already claimed or no referrer — nothing to do
  IF v_already_claimed OR v_referred_by IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Prevent self-referral
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND lower(username) = lower(v_referred_by)
  ) THEN
    UPDATE public.profiles SET referral_bonus_claimed = TRUE WHERE id = v_user_id;
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Look up referrer by username (case-insensitive)
  SELECT id INTO v_referrer_id
  FROM public.profiles
  WHERE lower(username) = lower(v_referred_by)
  LIMIT 1;

  -- Referrer no longer exists — mark claimed to stop retries
  IF v_referrer_id IS NULL THEN
    UPDATE public.profiles SET referral_bonus_claimed = TRUE WHERE id = v_user_id;
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;

  -- Award 500 gold to both users atomically
  UPDATE public.profiles
  SET gold_balance = gold_balance + v_bonus, referral_bonus_claimed = TRUE
  WHERE id = v_user_id;

  UPDATE public.profiles
  SET gold_balance = gold_balance + v_bonus
  WHERE id = v_referrer_id;

  RETURN QUERY SELECT TRUE, v_bonus;
END;
$$;
