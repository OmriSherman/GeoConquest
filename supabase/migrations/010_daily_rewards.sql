-- 010_daily_rewards.sql

-- Add daily reward tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reward_claim TIMESTAMPTZ;

-- Secure RPC for claiming a daily reward (once per UTC calendar day)
CREATE OR REPLACE FUNCTION public.claim_daily_reward()
RETURNS TABLE (
  success BOOLEAN,
  new_balance INTEGER,
  new_streak INTEGER,
  reward_amount INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_last_claim TIMESTAMPTZ;
  v_current_streak INTEGER;
  v_current_balance INTEGER;
  v_last_claim_date DATE;
  v_today DATE;
  v_reward INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Use server-side UTC date consistently to avoid timezone confusion
  v_today := (now() AT TIME ZONE 'UTC')::DATE;

  SELECT last_reward_claim, login_streak, gold_balance
  INTO v_last_claim, v_current_streak, v_current_balance
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_last_claim IS NOT NULL THEN
    v_last_claim_date := (v_last_claim AT TIME ZONE 'UTC')::DATE;

    -- Already claimed today (UTC)
    IF v_last_claim_date >= v_today THEN
      RETURN QUERY SELECT FALSE, v_current_balance, v_current_streak, 0;
      RETURN;
    END IF;

    -- Missed a day — reset streak
    IF v_last_claim_date < v_today - INTERVAL '1 day' THEN
      v_current_streak := 0;
    END IF;
  END IF;

  -- Increment streak
  v_current_streak := v_current_streak + 1;

  -- Reward based on streak day (day 7+ always gives 500)
  DECLARE
    cycle_day INTEGER := LEAST(v_current_streak, 7);
  BEGIN
    CASE cycle_day
      WHEN 1 THEN v_reward := 100;
      WHEN 2 THEN v_reward := 150;
      WHEN 3 THEN v_reward := 200;
      WHEN 4 THEN v_reward := 250;
      WHEN 5 THEN v_reward := 300;
      WHEN 6 THEN v_reward := 400;
      ELSE         v_reward := 500; -- day 7+
    END CASE;
  END;

  -- Apply updates
  UPDATE public.profiles
  SET
    gold_balance = gold_balance + v_reward,
    login_streak = v_current_streak,
    last_reward_claim = now()
  WHERE id = v_user_id
  RETURNING gold_balance INTO v_current_balance;

  RETURN QUERY SELECT TRUE, v_current_balance, v_current_streak, v_reward;
END;
$$;
